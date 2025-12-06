import { describe, it, expect } from 'vitest';
import { Commit, ProgramOptions } from '../src/types.js';

describe('types.ts', () => {
  describe('Commit interface', () => {
    it('should accept valid Commit objects', () => {
      const commit: Commit = {
        hash: 'abc123def456',
        shortHash: 'abc123',
        message: 'Fix bug in login',
        author: 'John Doe',
        date: '2 hours ago',
      };

      expect(commit.hash).toBe('abc123def456');
      expect(commit.shortHash).toBe('abc123');
      expect(commit.message).toBe('Fix bug in login');
      expect(commit.author).toBe('John Doe');
      expect(commit.date).toBe('2 hours ago');
    });

    it('should work with different message formats', () => {
      const commit: Commit = {
        hash: 'xyz789',
        shortHash: 'xyz7',
        message: 'feat: add new feature with special chars !@#$%',
        author: 'Jane',
        date: '1 day ago',
      };

      expect(commit.message).toContain('!@#$%');
    });
  });

  describe('ProgramOptions interface', () => {
    it('should accept valid ProgramOptions with all fields', () => {
      const options: ProgramOptions = {
        number: '50',
        all: true,
      };

      expect(options.number).toBe('50');
      expect(options.all).toBe(true);
    });

    it('should accept ProgramOptions without optional field', () => {
      const options: ProgramOptions = {
        number: '20',
      };

      expect(options.number).toBe('20');
      expect(options.all).toBeUndefined();
    });
  });
});
