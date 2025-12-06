import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Commit } from './types.js';

/**
 * Display commits and let user select one
 */
export async function selectCommit(commits: Commit[]): Promise<Commit | null> {
  const choices = commits.map((commit) => ({
    name: `${chalk.yellow(commit.shortHash)} ${chalk.white(truncate(commit.message, 50))} ${chalk.dim(`(${commit.author}, ${commit.date})`)}`,
    value: commit as Commit | null,
  }));

  // Add separator and cancel option
  choices.push({
    name: chalk.red('Cancel'),
    value: null,
  });

  const selectedCommit = await select({
    message: 'Select a commit to edit:',
    choices,
    pageSize: 15,
    loop: false,
  });

  return selectedCommit;
}

/**
 * Let user edit the commit message inline
 */
export async function editCommitMessage(currentMessage: string): Promise<string> {
  const newMessage = await input({
    message: 'Enter new commit message:',
    default: currentMessage,
    validate: (value: string) => {
      if (!value.trim()) {
        return 'Commit message cannot be empty';
      }
      return true;
    },
  });

  return newMessage.trim();
}

/**
 * Ask for confirmation
 */
export async function confirmAction(message: string): Promise<boolean> {
  const confirmed = await confirm({
    message,
    default: false,
  });

  return confirmed;
}

/**
 * Truncate a string to a specified length
 */
function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}
