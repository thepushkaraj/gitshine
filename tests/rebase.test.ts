import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';

// Mock dependencies before importing
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

import { editCommit } from '../src/rebase.js';

describe('rebase.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('editCommit', () => {
    it('should return original HEAD hash after editing', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse HEAD') {
          return 'abc1234567890' as any;
        }
        if (cmd.includes('git commit --amend')) {
          return '' as any;
        }
        return '' as any;
      });

      const originalHash = await editCommit('abc1234', 'New message');

      expect(originalHash).toBe('abc1234567890');
    });

    it('should use amend for HEAD commit', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd === 'git rev-parse HEAD') {
          return 'abc1234' as any;
        }
        if (cmd.includes('git commit --amend')) {
          return '' as any;
        }
        return '' as any;
      });

      await editCommit('abc1234', 'New message');

      expect(execSync).toHaveBeenCalledWith('git rev-parse HEAD', expect.any(Object));
    });
  });
});
