import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import ora from "ora";

/**
 * Edit a commit message using rebase.
 * Returns the original HEAD hash for undo purposes.
 */
export async function editCommit(
  commitHash: string,
  newMessage: string
): Promise<string> {
  const originalHead = execSync("git rev-parse HEAD", {
    encoding: "utf8",
  }).trim();

  const isHead = isHeadCommit(commitHash);
  const spinner = ora("Editing commit message...").start();

  try {
    if (isHead) {
      editHeadCommit(newMessage);
    } else {
      await editWithRebase(commitHash, newMessage);
    }
    spinner.succeed("Commit message edited successfully!");
    return originalHead;
  } catch (error) {
    spinner.fail("Failed to edit commit message");
    try {
      execSync("git rebase --abort", { stdio: "ignore" });
    } catch {}
    throw error;
  }
}

function isHeadCommit(commitHash: string): boolean {
  try {
    const headHash = execSync("git rev-parse HEAD", {
      encoding: "utf8",
    }).trim();
    return headHash.substring(0, 7) === commitHash.substring(0, 7);
  } catch {
    return false;
  }
}

function editHeadCommit(newMessage: string): void {
  const tempDir = os.tmpdir();
  const msgFile = path.join(tempDir, `commit-msg-${Date.now()}.txt`);
  fs.writeFileSync(msgFile, newMessage, "utf8");

  try {
    execSync(`git commit --amend -F "${msgFile.replace(/\\/g, "/")}"`, {
      stdio: "pipe",
      encoding: "utf8",
    });
  } finally {
    try {
      fs.unlinkSync(msgFile);
    } catch {}
  }
}

async function editWithRebase(
  commitHash: string,
  newMessage: string
): Promise<void> {
  const tempDir = os.tmpdir();
  const msgFile = path.join(tempDir, `gitshine-msg-${Date.now()}.txt`);
  fs.writeFileSync(msgFile, newMessage, "utf8");

  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
  const originalHead = execSync("git rev-parse HEAD", {
    encoding: "utf8",
  }).trim();

  try {
    execSync(`git checkout --detach ${commitHash}`, {
      stdio: "pipe",
      encoding: "utf8",
    });

    execSync(`git commit --amend -F "${msgFile.replace(/\\/g, "/")}"`, {
      stdio: "pipe",
      encoding: "utf8",
    });

    const amendedHash = execSync("git rev-parse HEAD", {
      encoding: "utf8",
    }).trim();

    execSync(`git rebase --onto ${amendedHash} ${commitHash} ${originalHead}`, {
      stdio: "pipe",
      encoding: "utf8",
    });

    const newHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    execSync(`git branch -f ${currentBranch} ${newHead}`, {
      stdio: "pipe",
      encoding: "utf8",
    });
    execSync(`git checkout ${currentBranch}`, {
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    try {
      execSync(`git checkout ${currentBranch}`, { stdio: "ignore" });
      execSync(`git reset --hard ${originalHead}`, { stdio: "ignore" });
    } catch {
      try {
        execSync(`git checkout -f ${currentBranch}`, { stdio: "ignore" });
      } catch {}
    }
    throw error;
  } finally {
    try {
      fs.unlinkSync(msgFile);
    } catch {}
  }
}

/**
 * Squash multiple contiguous commits into one.
 * @param commits - Array of commit hashes (newest first, oldest last)
 * @param newMessage - The commit message for the squashed commit
 * Returns the original HEAD hash for undo purposes.
 */
export async function squashCommits(
  commits: string[],
  newMessage: string
): Promise<string> {
  const newestHash = commits[0];
  const oldestHash = commits[commits.length - 1];

  const originalHead = execSync("git rev-parse HEAD", {
    encoding: "utf8",
  }).trim();
  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();

  const spinner = ora(`Squashing ${commits.length} commits...`).start();

  const tempDir = os.tmpdir();
  const msgFile = path.join(tempDir, `gitshine-squash-${Date.now()}.txt`);
  fs.writeFileSync(msgFile, newMessage, "utf8");

  try {
    let parentOfOldest: string;
    let isRootSquash = false;
    let tempBranch = "";

    try {
      parentOfOldest = execSync(`git rev-parse ${oldestHash}~1`, {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
    } catch {
      parentOfOldest = "";
      isRootSquash = true;
    }

    execSync(`git checkout --detach ${newestHash}`, {
      stdio: "pipe",
      encoding: "utf8",
    });

    if (!isRootSquash) {
      execSync(`git reset --soft ${parentOfOldest}`, {
        stdio: "pipe",
        encoding: "utf8",
      });

      execSync(`git commit -F "${msgFile.replace(/\\/g, "/")}"`, {
        stdio: "pipe",
        encoding: "utf8",
      });
    } else {
      // Root commit: use --orphan to create a new root commit
      tempBranch = `gitshine-temp-${Date.now()}`;
      execSync(`git checkout --orphan ${tempBranch}`, {
        stdio: "pipe",
        encoding: "utf8",
      });

      execSync(`git commit -F "${msgFile.replace(/\\/g, "/")}"`, {
        stdio: "pipe",
        encoding: "utf8",
      });
    }

    const squashedHash = execSync("git rev-parse HEAD", {
      encoding: "utf8",
    }).trim();

    if (originalHead !== newestHash) {
      execSync(
        `git rebase --onto ${squashedHash} ${newestHash} ${originalHead}`,
        { stdio: "pipe", encoding: "utf8" }
      );
    }

    const newHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    execSync(`git branch -f ${currentBranch} ${newHead}`, {
      stdio: "pipe",
      encoding: "utf8",
    });
    execSync(`git checkout ${currentBranch}`, {
      stdio: "pipe",
      encoding: "utf8",
    });

    if (tempBranch) {
      try {
        execSync(`git branch -D ${tempBranch}`, { stdio: "ignore" });
      } catch {}
    }

    spinner.succeed(`Squashed ${commits.length} commits into one!`);
    return originalHead;
  } catch (error) {
    spinner.fail("Failed to squash commits");

    try {
      execSync(`git checkout ${currentBranch}`, { stdio: "ignore" });
      execSync(`git reset --hard ${originalHead}`, { stdio: "ignore" });
    } catch {
      try {
        execSync(`git checkout -f ${currentBranch}`, { stdio: "ignore" });
        execSync(`git reset --hard ${originalHead}`, { stdio: "ignore" });
      } catch {}
    }

    throw error;
  } finally {
    try {
      fs.unlinkSync(msgFile);
    } catch {}
  }
}
