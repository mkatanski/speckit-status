/**
 * Git utilities for branch detection
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Get the current git branch name
 */
export function getCurrentBranch(cwd: string = process.cwd()): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch;
  } catch {
    return null;
  }
}

/**
 * Determine the spec folder from the current git branch
 *
 * Supports patterns:
 * - Direct branch name as spec folder (e.g., "001-portfolio-website")
 * - Feature branch pattern (e.g., "feature/001-portfolio-website")
 * - Any branch containing a spec ID pattern
 */
export function getSpecFolderFromBranch(
  cwd: string = process.cwd(),
  specsDir: string = 'specs'
): string | null {
  const branch = getCurrentBranch(cwd);
  if (!branch) {
    return null;
  }

  // Try 1: Branch name IS the spec folder name
  const directPath = join(cwd, specsDir, branch);
  if (existsSync(directPath)) {
    return directPath;
  }

  // Try 2: Extract spec ID from branch patterns like "feature/001-portfolio-website"
  // Pattern: 3 digits followed by a hyphen and lowercase alphanumeric with hyphens
  const specIdMatch = branch.match(/(\d{3}-[a-z0-9-]+)/);
  const specId = specIdMatch?.[1];
  if (specId) {
    const specPath = join(cwd, specsDir, specId);
    if (existsSync(specPath)) {
      return specPath;
    }
  }

  return null;
}

/**
 * Get the spec name from a spec folder path
 */
export function getSpecName(specFolder: string): string {
  // Extract the folder name from the path
  const parts = specFolder.split(/[/\\]/);
  return parts[parts.length - 1] ?? 'unknown';
}
