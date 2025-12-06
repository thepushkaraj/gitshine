import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { Commit } from './types.js';

const execAsync = promisify(exec);

/**
 * Check if the current directory is a git repository
 */
export async function checkGitRepository(): Promise<boolean> {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the list of commits
 */
export async function getCommits(limit: number | null = 20): Promise<Commit[]> {
  try {
    const limitArg = limit ? `-n ${limit}` : '';
    const format = '%H|%h|%s|%an|%ar';
    const { stdout } = await execAsync(
      `git log ${limitArg} --format="${format}"`,
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer for large repos
    );

    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, shortHash, message, author, date] = line.split('|');
        return { hash, shortHash, message, author, date };
      });
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to get commits: ${err.message}`);
  }
}


/**
 * Check if a rebase is in progress
 */
export async function isRebaseInProgress(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git rev-parse --git-path rebase-merge');
    const rebaseMergePath = stdout.trim();
    if (fs.existsSync(rebaseMergePath)) return true;

    const { stdout: stdout2 } = await execAsync('git rev-parse --git-path rebase-apply');
    const rebaseApplyPath = stdout2.trim();
    return fs.existsSync(rebaseApplyPath);
  } catch {
    return false;
  }
}
