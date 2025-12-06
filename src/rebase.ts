import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ora from 'ora';

/**
 * Edit a commit message using rebase
 * Returns the original HEAD hash for undo purposes
 */
export async function editCommit(commitHash: string, newMessage: string): Promise<string> {
  // Save original HEAD for undo
  const originalHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  // Check if it's the most recent commit (HEAD)
  const isHead = isHeadCommit(commitHash);

  const spinner = ora('Editing commit message...').start();

  try {
    if (isHead) {
      // For HEAD commit, simply use git commit --amend
      editHeadCommit(newMessage);
    } else {
      // For other commits, use rebase
      await editWithRebase(commitHash, newMessage);
    }
    spinner.succeed('Commit message edited successfully!');
    return originalHead;
  } catch (error) {
    spinner.fail('Failed to edit commit message');

    // Try to abort any in-progress rebase
    try {
      execSync('git rebase --abort', { stdio: 'ignore' });
    } catch {
      // Ignore if abort fails
    }

    throw error;
  }
}

/**
 * Check if the commit is HEAD
 */
function isHeadCommit(commitHash: string): boolean {
  try {
    const headHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    // Compare short hashes (7 chars) to handle both full and short hash inputs
    return headHash.substring(0, 7) === commitHash.substring(0, 7);
  } catch {
    return false;
  }
}

/**
 * Edit the HEAD commit using git commit --amend
 */
function editHeadCommit(newMessage: string): void {
  // Write message to temp file and use -F flag to avoid shell escaping issues
  const tempDir = os.tmpdir();
  const msgFile = path.join(tempDir, `commit-msg-${Date.now()}.txt`);
  fs.writeFileSync(msgFile, newMessage, 'utf8');
  
  try {
    execSync(`git commit --amend -F "${msgFile.replace(/\\/g, '/')}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } finally {
    try { fs.unlinkSync(msgFile); } catch {}
  }
}

/**
 * Edit a commit using rebase
 * Approach: checkout commit, amend message, rebase remaining commits on top
 */
async function editWithRebase(commitHash: string, newMessage: string): Promise<void> {
  const tempDir = os.tmpdir();
  const msgFile = path.join(tempDir, `gitshine-msg-${Date.now()}.txt`);
  
  fs.writeFileSync(msgFile, newMessage, 'utf8');

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const originalHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  try {
    // 1. Detach at the target commit
    execSync(`git checkout --detach ${commitHash}`, { stdio: 'pipe', encoding: 'utf8' });
    
    // 2. Amend the message
    execSync(`git commit --amend -F "${msgFile.replace(/\\/g, '/')}"`, { stdio: 'pipe', encoding: 'utf8' });
    
    // 3. Get the amended commit hash
    const amendedHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    
    // 4. Rebase remaining commits onto the amended commit
    execSync(`git rebase --onto ${amendedHash} ${commitHash} ${originalHead}`, { stdio: 'pipe', encoding: 'utf8' });
    
    // 5. Update branch to new HEAD
    const newHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    execSync(`git branch -f ${currentBranch} ${newHead}`, { stdio: 'pipe', encoding: 'utf8' });
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe', encoding: 'utf8' });
  } catch (error) {
    // Recovery: restore original state
    try {
      execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' });
      execSync(`git reset --hard ${originalHead}`, { stdio: 'ignore' });
    } catch {
      try {
        execSync(`git checkout -f ${currentBranch}`, { stdio: 'ignore' });
      } catch {}
    }
    throw error;
  } finally {
    try { fs.unlinkSync(msgFile); } catch {}
  }
}
