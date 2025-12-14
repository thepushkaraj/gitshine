#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import {
  checkGitRepository,
  getCommits,
  hasUncommittedChanges,
  isRebaseInProgress,
} from "./git.js";
import {
  selectCommit,
  editCommitMessage,
  confirmAction,
  selectCommitsToSquash,
  inputSquashMessage,
  selectOperation,
} from "./ui.js";
import { editCommit, squashCommits } from "./rebase.js";
import { ProgramOptions } from "./types.js";

async function runReword(commits: import("./types.js").Commit[]) {
  const selectedCommit = await selectCommit(commits);

  if (!selectedCommit) {
    console.log(chalk.yellow("No commit selected. Exiting."));
    process.exit(0);
  }

  console.log(chalk.dim("\nCurrent commit message:"));
  console.log(chalk.white(`  "${selectedCommit.message}"\n`));

  const newMessage = await editCommitMessage(selectedCommit.message);

  if (newMessage === selectedCommit.message) {
    console.log(chalk.yellow("\nCommit message unchanged. No action taken."));
    process.exit(0);
  }

  console.log(chalk.dim("\nNew commit message:"));
  console.log(chalk.green(`  "${newMessage}"\n`));

  const confirmed = await confirmAction(
    "Are you sure you want to edit this commit message? This will rewrite history."
  );

  if (!confirmed) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  const originalHead = await editCommit(selectedCommit.hash, newMessage);

  console.log(
    chalk.dim(`\nTo undo: git reset --hard ${originalHead.substring(0, 7)}`)
  );
  console.log(
    chalk.yellow(
      "\nNote: If this branch has been pushed, you will need to force push:"
    )
  );
  console.log(chalk.cyan("  git push --force-with-lease"));
}

async function runSquash(commits: import("./types.js").Commit[]) {
  if (commits.length < 2) {
    console.log(chalk.yellow("Need at least 2 commits to squash."));
    process.exit(0);
  }

  const selectedCommits = await selectCommitsToSquash(commits);

  if (!selectedCommits || selectedCommits.length < 2) {
    console.log(chalk.yellow("\nNeed at least 2 commits to squash."));
    process.exit(0);
  }

  const squashMessage = await inputSquashMessage(selectedCommits);

  console.log(chalk.dim("\nSquash commit message:"));
  console.log(chalk.green(`  "${squashMessage}"\n`));

  const confirmed = await confirmAction(
    `Are you sure you want to squash ${selectedCommits.length} commits? This will rewrite history.`
  );

  if (!confirmed) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  const commitHashes = selectedCommits.map((c) => c.hash);
  const originalHead = await squashCommits(commitHashes, squashMessage);

  console.log(
    chalk.dim(`\nTo undo: git reset --hard ${originalHead.substring(0, 7)}`)
  );
  console.log(
    chalk.yellow(
      "\nNote: If this branch has been pushed, you will need to force push:"
    )
  );
  console.log(chalk.cyan("  git push --force-with-lease"));
}

program
  .name("gitshine")
  .description("Shine up your git commits")
  .version("0.2.0")
  .option("-n, --number <count>", "Number of commits to display", "20")
  .option("-a, --all", "Show all commits")
  .option("-s, --squash", "Squash multiple commits into one")
  .option("-r, --reword", "Reword a commit message")
  .action(async (options: ProgramOptions) => {
    try {
      const isGitRepo = await checkGitRepository();
      if (!isGitRepo) {
        console.error(chalk.red("Error: Not a git repository"));
        console.log(
          chalk.yellow("Please run this command from within a git repository.")
        );
        process.exit(1);
      }

      if (await hasUncommittedChanges()) {
        console.error(chalk.red("Error: You have uncommitted changes"));
        console.log(chalk.yellow("Please commit or stash them first:"));
        console.log(chalk.cyan("  git stash"));
        process.exit(1);
      }

      if (await isRebaseInProgress()) {
        console.error(chalk.red("Error: A rebase is already in progress"));
        console.log(chalk.yellow("Please complete or abort it first:"));
        console.log(chalk.cyan("  git rebase --continue"));
        console.log(chalk.cyan("  git rebase --abort"));
        process.exit(1);
      }

      const limit = options.all ? null : parseInt(options.number, 10);
      const commits = await getCommits(limit);

      if (commits.length === 0) {
        console.log(chalk.yellow("No commits found in this repository."));
        process.exit(0);
      }

      console.log(chalk.cyan("\n✨ gitshine - Shine Up Your Git Commits\n"));

      // Determine mode: explicit flag or interactive selection
      let mode: "reword" | "squash" | null = null;

      if (options.squash) {
        mode = "squash";
      } else if (options.reword) {
        mode = "reword";
      } else {
        // Interactive mode
        mode = await selectOperation();
      }

      if (!mode) {
        console.log(chalk.yellow("Operation cancelled."));
        process.exit(0);
      }

      if (mode === "squash") {
        await runSquash(commits);
      } else {
        await runReword(commits);
      }
    } catch (error) {
      const err = error as Error;
      if (err.message === "User cancelled") {
        console.log(chalk.yellow("\nOperation cancelled."));
        process.exit(0);
      }
      console.error(chalk.red(`\nError: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
