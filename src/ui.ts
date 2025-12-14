import { select, input, confirm, checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import { Commit } from "./types.js";

export type OperationMode = "reword" | "squash" | null;

/** Show main menu to select operation */
export async function selectOperation(): Promise<OperationMode> {
  const choice = await select({
    message: "What would you like to do?",
    choices: [
      {
        name: `${chalk.cyan("✏️  Reword")} ${chalk.dim(
          "- Edit a commit message"
        )}`,
        value: "reword" as OperationMode,
      },
      {
        name: `${chalk.cyan("📦 Squash")} ${chalk.dim(
          "- Combine multiple commits into one"
        )}`,
        value: "squash" as OperationMode,
      },
      {
        name: chalk.red("Cancel"),
        value: null,
      },
    ],
    loop: false,
  });

  return choice;
}

/** Display commits and let user select one */
export async function selectCommit(commits: Commit[]): Promise<Commit | null> {
  const choices = commits.map((commit) => ({
    name: `${chalk.yellow(commit.shortHash)} ${chalk.white(
      truncate(commit.message, 50)
    )} ${chalk.dim(`(${commit.author}, ${commit.date})`)}`,
    value: commit as Commit | null,
  }));

  choices.push({
    name: chalk.red("Cancel"),
    value: null,
  });

  return await select({
    message: "Select a commit to edit:",
    choices,
    pageSize: 15,
    loop: false,
  });
}

/** Let user edit the commit message inline */
export async function editCommitMessage(
  currentMessage: string
): Promise<string> {
  const newMessage = await input({
    message: "Enter new commit message:",
    default: currentMessage,
    validate: (value: string) => {
      if (!value.trim()) return "Commit message cannot be empty";
      return true;
    },
  });

  return newMessage.trim();
}

/** Ask for confirmation */
export async function confirmAction(message: string): Promise<boolean> {
  return await confirm({
    message,
    default: false,
  });
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + "...";
}

/** Check if selected indices are consecutive */
function areConsecutive(indices: number[]): boolean {
  if (indices.length < 2) return true;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

/** Select commits to squash using checkboxes */
export async function selectCommitsToSquash(
  commits: Commit[]
): Promise<Commit[] | null> {
  console.log(chalk.dim("\nSelect commits to squash (must be consecutive):"));
  console.log(
    chalk.dim("Use ↑↓ to navigate, Space to select, Enter to confirm\n")
  );

  const choices = commits.map((commit, index) => ({
    name: `${chalk.yellow(commit.shortHash)} ${chalk.white(
      truncate(commit.message, 50)
    )} ${chalk.dim(`(${commit.author}, ${commit.date})`)}`,
    value: index,
  }));

  let selectedIndices: number[] = [];
  let isValid = false;

  while (!isValid) {
    selectedIndices = await checkbox({
      message: "Select commits to squash:",
      choices,
      pageSize: 15,
      required: true,
    });

    if (selectedIndices.length === 0) {
      return null;
    }

    if (selectedIndices.length < 2) {
      console.log(
        chalk.yellow("\n⚠ Need at least 2 commits to squash. Try again.\n")
      );
      continue;
    }

    if (!areConsecutive(selectedIndices)) {
      console.log(
        chalk.yellow("\n⚠ Selected commits must be consecutive. Try again.\n")
      );
      continue;
    }

    isValid = true;
  }

  // Sort indices and get commits
  const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
  const selectedCommits = sortedIndices.map((i) => commits[i]);

  return selectedCommits;
}

/** Get the squash commit message from user */
export async function inputSquashMessage(commits: Commit[]): Promise<string> {
  console.log(chalk.dim("\nCommits to squash (oldest to newest):"));
  [...commits].reverse().forEach((c) => {
    console.log(chalk.dim(`  ${chalk.yellow(c.shortHash)} ${c.message}`));
  });

  const newMessage = await input({
    message: "Enter squash commit message:",
    default: commits[commits.length - 1].message, // oldest commit message as default
    validate: (value: string) => {
      if (!value.trim()) return "Commit message cannot be empty";
      return true;
    },
  });

  return newMessage.trim();
}
