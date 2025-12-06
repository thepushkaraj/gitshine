import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync, exec } from 'child_process';
import fs from 'fs';

// Mock child_process and fs before importing the module
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Import functions after mocking
import {
  checkGitRepository,
  hasUncommittedChanges,
  getCommits,
  isRebaseInProgress,
} from '../src/git.js';

describe('git.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkGitRepository', () => {
    it('should return true when in a git repository', async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('.git'));

      const result = await checkGitRepository();

      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith('git rev-parse --git-dir', { stdio: 'ignore' });
    });

    it('should return false when not in a git repository', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = await checkGitRepository();

      expect(result).toBe(false);
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when there are uncommitted changes', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: ' M src/file.ts\n', stderr: '' });
        return {} as any;
      });

      const result = await hasUncommittedChanges();

      expect(result).toBe(true);
    });

    it('should return false when there are no uncommitted changes', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await hasUncommittedChanges();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('git error'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await hasUncommittedChanges();

      expect(result).toBe(false);
    });
  });

  describe('getCommits', () => {
    it('should parse commits correctly', async () => {
      const mockOutput = 'abc123|abc1234|Fix bug|John Doe|2 hours ago\ndef456|def5678|Add feature|Jane Doe|1 day ago';

      vi.mocked(exec).mockImplementation((cmd, options, callback?: any) => {
        const cb = typeof options === 'function' ? options : callback;
        cb(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const commits = await getCommits(20);

      expect(commits).toHaveLength(2);
      expect(commits[0]).toEqual({
        hash: 'abc123',
        shortHash: 'abc1234',
        message: 'Fix bug',
        author: 'John Doe',
        date: '2 hours ago',
      });
    });

    it('should return empty array when no commits', async () => {
      vi.mocked(exec).mockImplementation((cmd, options, callback?: any) => {
        const cb = typeof options === 'function' ? options : callback;
        cb(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const commits = await getCommits(20);

      expect(commits).toEqual([]);
    });

    it('should throw error on failure', async () => {
      vi.mocked(exec).mockImplementation((cmd, options, callback?: any) => {
        const cb = typeof options === 'function' ? options : callback;
        cb(new Error('git log failed'), null);
        return {} as any;
      });

      await expect(getCommits(20)).rejects.toThrow('Failed to get commits');
    });
  });



  describe('isRebaseInProgress', () => {
    it('should return true when rebase-merge exists', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '.git/rebase-merge', stderr: '' });
        return {} as any;
      });
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);

      const result = await isRebaseInProgress();

      expect(result).toBe(true);
    });

    it('should return true when rebase-apply exists', async () => {
      vi.mocked(exec)
        .mockImplementationOnce((cmd, callback: any) => {
          callback(null, { stdout: '.git/rebase-merge', stderr: '' });
          return {} as any;
        })
        .mockImplementationOnce((cmd, callback: any) => {
          callback(null, { stdout: '.git/rebase-apply', stderr: '' });
          return {} as any;
        });
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = await isRebaseInProgress();

      expect(result).toBe(true);
    });

    it('should return false when no rebase in progress', async () => {
      vi.mocked(exec)
        .mockImplementationOnce((cmd, callback: any) => {
          callback(null, { stdout: '.git/rebase-merge', stderr: '' });
          return {} as any;
        })
        .mockImplementationOnce((cmd, callback: any) => {
          callback(null, { stdout: '.git/rebase-apply', stderr: '' });
          return {} as any;
        });
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await isRebaseInProgress();

      expect(result).toBe(false);
    });
  });
});
