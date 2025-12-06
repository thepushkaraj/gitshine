#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { checkGitRepository, getCommits, hasUncommittedChanges, isRebaseInProgress } from './git.js';
import { selectCommit, editCommitMessage, confirmAction } from './ui.js';
import { editCommit } from './rebase.js';
import { ProgramOptions } from './types.js';

program
  .name('gitshine')
  .description('Shine up your git commits')
  .version('0.1.0')
  .option('-n, --number <count>', 'Number of commits to display', '20')
  .option('-a, --all', 'Show all commits')
  .action(async (options: ProgramOptions) => {
    try {
      // Check if we're in a git repository
      const isGitRepo = await checkGitRepository();
      if (!isGitRepo) {
        console.error(chalk.red('Error: Not a git repository'));
        console.log(chalk.yellow('Please run this command from within a git repository.'));
        process.exit(1);
      }

      // Check for uncommitted changes early
      if (await hasUncommittedChanges()) {
        console.error(chalk.red('Error: You have uncommitted changes'));
        console.log(chalk.yellow('Please commit or stash them first:'));
        console.log(chalk.cyan('  git stash'));
        process.exit(1);
      }

      // Check if rebase is in progress
      if (await isRebaseInProgress()) {
        console.error(chalk.red('Error: A rebase is already in progress'));
        console.log(chalk.yellow('Please complete or abort it first:'));
        console.log(chalk.cyan('  git rebase --continue'));
        console.log(chalk.cyan('  git rebase --abort'));
        process.exit(1);
      }

      // Get commits
      const limit = options.all ? null : parseInt(options.number, 10);
      const commits = await getCommits(limit);

      if (commits.length === 0) {
        console.log(chalk.yellow('No commits found in this repository.'));
        process.exit(0);
      }

      console.log(chalk.cyan('\n✨ gitshine - Shine Up Your Git Commits\n'));

      // Select a commit
      const selectedCommit = await selectCommit(commits);

      if (!selectedCommit) {
        console.log(chalk.yellow('No commit selected. Exiting.'));
        process.exit(0);
      }

      console.log(chalk.dim('\nCurrent commit message:'));
      console.log(chalk.white(`  "${selectedCommit.message}"\n`));

      // Edit the commit message
      const newMessage = await editCommitMessage(selectedCommit.message);

      if (newMessage === selectedCommit.message) {
        console.log(chalk.yellow('\nCommit message unchanged. No action taken.'));
        process.exit(0);
      }

      // Confirm the action
      console.log(chalk.dim('\nNew commit message:'));
      console.log(chalk.green(`  "${newMessage}"\n`));

      const confirmed = await confirmAction(
        'Are you sure you want to edit this commit message? This will rewrite history.'
      );

      if (!confirmed) {
        console.log(chalk.yellow('\nOperation cancelled.'));
        process.exit(0);
      }

      // Perform the edit
      const originalHead = await editCommit(selectedCommit.hash, newMessage);

      console.log(chalk.dim(`\nTo undo: git reset --hard ${originalHead.substring(0, 7)}`));
      console.log(chalk.yellow('\nNote: If this branch has been pushed, you will need to force push:'));
      console.log(chalk.cyan('  git push --force-with-lease'));

    } catch (error) {
      const err = error as Error;
      if (err.message === 'User cancelled') {
        console.log(chalk.yellow('\nOperation cancelled.'));
        process.exit(0);
      }
      console.error(chalk.red(`\nError: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
