/**
 * Tests for git-utils.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentBranch, getSpecFolderFromBranch, getSpecName } from '../git-utils.js';
import * as childProcess from 'child_process';
import * as fs from 'fs';

// Mock child_process and fs modules
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('git-utils', () => {
  // Use vi.fn() directly to avoid Buffer type issues with execSync overloads
  const mockExecSync = childProcess.execSync as ReturnType<typeof vi.fn>;
  const mockExistsSync = vi.mocked(fs.existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      mockExecSync.mockReturnValue('main\n');

      const result = getCurrentBranch('/path/to/repo');

      expect(result).toBe('main');
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', {
        cwd: '/path/to/repo',
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should trim whitespace from branch name', () => {
      mockExecSync.mockReturnValue('  feature/test  \n');

      const result = getCurrentBranch('/path/to/repo');

      expect(result).toBe('feature/test');
    });

    it('should return null when git command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = getCurrentBranch('/path/to/repo');

      expect(result).toBeNull();
    });

    it('should use process.cwd() by default', () => {
      mockExecSync.mockReturnValue('main\n');
      const cwd = process.cwd();

      getCurrentBranch();

      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should handle detached HEAD state', () => {
      mockExecSync.mockReturnValue('HEAD\n');

      const result = getCurrentBranch('/path/to/repo');

      expect(result).toBe('HEAD');
    });

    it('should handle branch names with slashes', () => {
      mockExecSync.mockReturnValue('feature/add-new-feature\n');

      const result = getCurrentBranch('/path/to/repo');

      expect(result).toBe('feature/add-new-feature');
    });

    it('should handle branch names with special characters', () => {
      mockExecSync.mockReturnValue('bugfix/issue-123-fix\n');

      const result = getCurrentBranch('/path/to/repo');

      expect(result).toBe('bugfix/issue-123-fix');
    });
  });

  describe('getSpecFolderFromBranch', () => {
    it('should return direct branch path if it exists', () => {
      mockExecSync.mockReturnValue('001-portfolio-website\n');
      mockExistsSync.mockReturnValue(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBe('/path/to/repo/specs/001-portfolio-website');
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/repo/specs/001-portfolio-website');
    });

    it('should extract spec ID from feature branch pattern', () => {
      mockExecSync.mockReturnValue('feature/001-portfolio-website\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBe('/path/to/repo/specs/001-portfolio-website');
      expect(mockExistsSync).toHaveBeenCalledWith(
        '/path/to/repo/specs/feature/001-portfolio-website'
      );
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/repo/specs/001-portfolio-website');
    });

    it('should return null when no branch is found', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBeNull();
    });

    it('should return null when spec folder does not exist', () => {
      mockExecSync.mockReturnValue('main\n');
      mockExistsSync.mockReturnValue(false);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBeNull();
    });

    it('should use default specs directory', () => {
      mockExecSync.mockReturnValue('001-test\n');
      mockExistsSync.mockReturnValue(true);

      getSpecFolderFromBranch('/path/to/repo');

      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/repo/specs/001-test');
    });

    it('should use process.cwd() by default', () => {
      mockExecSync.mockReturnValue('001-test\n');
      mockExistsSync.mockReturnValue(true);
      const cwd = process.cwd();

      getSpecFolderFromBranch();

      expect(mockExistsSync).toHaveBeenCalledWith(`${cwd}/specs/001-test`);
    });

    it('should handle branch with spec ID in middle', () => {
      mockExecSync.mockReturnValue('bugfix/123-my-spec-name/extra\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBe('/path/to/repo/specs/123-my-spec-name');
    });

    it('should match spec ID pattern with lowercase and hyphens', () => {
      mockExecSync.mockReturnValue('feature/042-awesome-feature-name\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBe('/path/to/repo/specs/042-awesome-feature-name');
    });

    it('should not match invalid spec ID patterns', () => {
      mockExecSync.mockReturnValue('feature/12-too-short\n');
      mockExistsSync.mockReturnValue(false);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBeNull();
    });

    it('should not match spec ID with uppercase letters', () => {
      mockExecSync.mockReturnValue('feature/001-MySpec\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBeNull();
    });

    it('should handle custom specs directory', () => {
      mockExecSync.mockReturnValue('001-test\n');
      mockExistsSync.mockReturnValue(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'custom-specs');

      expect(result).toBe('/path/to/repo/custom-specs/001-test');
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/repo/custom-specs/001-test');
    });

    it('should prioritize direct branch match over extracted spec ID', () => {
      mockExecSync.mockReturnValue('feature/001-test\n');
      mockExistsSync.mockReturnValueOnce(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBe('/path/to/repo/specs/feature/001-test');
      expect(mockExistsSync).toHaveBeenCalledTimes(1);
    });

    it('should handle branch names with multiple numbers', () => {
      mockExecSync.mockReturnValue('feature/001-spec-with-123-numbers\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      expect(result).toBe('/path/to/repo/specs/001-spec-with-123-numbers');
    });

    it('should match first spec ID pattern in branch name', () => {
      mockExecSync.mockReturnValue('prefix-001-first-spec-002-second\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = getSpecFolderFromBranch('/path/to/repo', 'specs');

      // Should extract 001-first-spec
      expect(result).toBe('/path/to/repo/specs/001-first-spec-002-second');
    });
  });

  describe('getSpecName', () => {
    it('should extract folder name from path with forward slashes', () => {
      const result = getSpecName('/path/to/specs/001-my-spec');

      expect(result).toBe('001-my-spec');
    });

    it('should extract folder name from path with backslashes', () => {
      const result = getSpecName('C:\\path\\to\\specs\\001-my-spec');

      expect(result).toBe('001-my-spec');
    });

    it('should extract folder name from path with mixed slashes', () => {
      const result = getSpecName('/path\\to/specs\\001-my-spec');

      expect(result).toBe('001-my-spec');
    });

    it('should handle path with trailing slash', () => {
      const result = getSpecName('/path/to/specs/001-my-spec/');

      expect(result).toBe('');
    });

    it('should handle simple folder name', () => {
      const result = getSpecName('001-my-spec');

      expect(result).toBe('001-my-spec');
    });

    it('should return empty string for empty path', () => {
      const result = getSpecName('');

      // Empty string split results in [''], so last element is ''
      expect(result).toBe('');
    });

    it('should handle path with single component', () => {
      const result = getSpecName('specs');

      expect(result).toBe('specs');
    });

    it('should extract last component from deep path', () => {
      const result = getSpecName('/very/deep/nested/path/to/specs/my-spec-folder');

      expect(result).toBe('my-spec-folder');
    });

    it('should handle Windows-style absolute path', () => {
      const result = getSpecName('C:\\Users\\Name\\Projects\\specs\\001-test');

      expect(result).toBe('001-test');
    });

    it('should handle path with dots', () => {
      const result = getSpecName('/path/to/../specs/./001-test');

      expect(result).toBe('001-test');
    });

    it('should handle path with spaces', () => {
      const result = getSpecName('/path/to/my specs/001 my spec');

      expect(result).toBe('001 my spec');
    });

    it('should handle path with special characters', () => {
      const result = getSpecName('/path/to/specs/001-spec_name.test');

      expect(result).toBe('001-spec_name.test');
    });
  });

  describe('integration scenarios', () => {
    it('should work end-to-end for typical branch workflow', () => {
      mockExecSync.mockReturnValue('feature/001-portfolio-website\n');
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const specFolder = getSpecFolderFromBranch('/home/user/project', 'specs');
      expect(specFolder).toBe('/home/user/project/specs/001-portfolio-website');

      const specName = getSpecName(specFolder ?? '');
      expect(specName).toBe('001-portfolio-website');
    });

    it('should handle case where git is not available', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git command not found');
      });

      const branch = getCurrentBranch('/path/to/repo');
      expect(branch).toBeNull();

      const specFolder = getSpecFolderFromBranch('/path/to/repo');
      expect(specFolder).toBeNull();
    });

    it('should handle case where branch exists but spec folder does not', () => {
      mockExecSync.mockReturnValue('feature/999-nonexistent\n');
      mockExistsSync.mockReturnValue(false);

      const specFolder = getSpecFolderFromBranch('/path/to/repo');
      expect(specFolder).toBeNull();
    });
  });
});
