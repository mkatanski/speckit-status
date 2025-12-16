/**
 * Dependency section parser
 * Parses the "Dependencies & Execution Order" section from tasks.md
 */

import type { PhaseDependency } from './types.js';

// Section markers
const DEPENDENCIES_SECTION_START = '## Dependencies & Execution Order';
const PHASE_DEPENDENCIES_HEADER = '### Phase Dependencies';
const PARALLEL_OPPORTUNITIES_HEADER = '### Parallel Opportunities';

// Regex patterns for Phase Dependencies section
// Matches: "- **Phase 1 (Setup)**: Description..."
const PHASE_DEP_LINE_REGEX = /^-\s+\*\*Phase\s+(\d+)\s+\(([^)]+)\)\*\*:\s*(.+)$/;

// Extract "Depends on Phase X" - may have multiple
const DEPENDS_ON_REGEX = /[Dd]epends on Phase (\d+)/g;

// Detect "Depends on all" pattern (for phases that depend on all previous phases)
const DEPENDS_ON_ALL_REGEX = /[Dd]epends on all/i;

// Extract "BLOCKS" or "Blocks Phase X"
const BLOCKS_ALL_REGEX = /BLOCKS all/i;
const BLOCKS_PHASE_REGEX = /[Bb]locks Phase (\d+)/g;

// Extract "Can run parallel to Phase X/Y"
const PARALLEL_TO_REGEX = /parallel to Phase[s]?\s*([\d/]+)/;

// Regex patterns for Parallel Opportunities section
// Matches: "**Phase 1 (Setup)**: T002-T018 can mostly run..."
const PARALLEL_OPP_LINE_REGEX = /^\*\*Phase\s+(\d+)\s+\([^)]+\)\*\*:\s*(.+)$/;

// Extract task IDs and ranges: T002-T018, T068-T069, T071, T080
const TASK_ID_REGEX = /T(\d+)/g;
const TASK_RANGE_REGEX = /T(\d+)-T(\d+)/g;

/**
 * Extract task IDs from a parallel opportunities description
 * Handles both ranges (T002-T018) and individual IDs (T071, T080)
 */
function extractParallelTasks(description: string): string[] {
  const tasks: string[] = [];

  // First extract ranges
  const rangeMatches = description.matchAll(TASK_RANGE_REGEX);
  const processedRanges = new Set<string>();

  for (const match of rangeMatches) {
    const start = parseInt(match[1] ?? '0', 10);
    const end = parseInt(match[2] ?? '0', 10);
    // Add all tasks in range
    for (let i = start; i <= end; i++) {
      const taskId = `T${i.toString().padStart(3, '0')}`;
      tasks.push(taskId);
      processedRanges.add(taskId);
    }
  }

  // Then extract individual IDs (that aren't part of ranges)
  const idMatches = description.matchAll(TASK_ID_REGEX);
  for (const match of idMatches) {
    const taskId = `T${match[1]?.padStart(3, '0')}`;
    if (!processedRanges.has(taskId)) {
      tasks.push(taskId);
    }
  }

  return [...new Set(tasks)].sort();
}

/**
 * Parse a single phase dependency line
 */
function parsePhaseDependencyLine(
  line: string,
  allPhaseNumbers: number[]
): { phaseNumber: number; dependency: PhaseDependency } | null {
  const match = line.match(PHASE_DEP_LINE_REGEX);
  if (!match) return null;

  const phaseNumber = parseInt(match[1] ?? '0', 10);
  const shortName = match[2] ?? '';
  const description = match[3] ?? '';

  // Extract dependencies
  const dependsOn: number[] = [];

  // Check for "Depends on all" pattern first
  if (DEPENDS_ON_ALL_REGEX.test(description)) {
    // This phase depends on all previous phases
    dependsOn.push(...allPhaseNumbers.filter((n) => n < phaseNumber));
  } else {
    // Extract specific phase dependencies
    const dependsMatches = description.matchAll(DEPENDS_ON_REGEX);
    for (const m of dependsMatches) {
      dependsOn.push(parseInt(m[1] ?? '0', 10));
    }
  }

  // Extract blocks
  const blocks: number[] = [];
  if (BLOCKS_ALL_REGEX.test(description)) {
    // Blocks all subsequent phases (simplified: phases after this one)
    blocks.push(...allPhaseNumbers.filter((n) => n > phaseNumber));
  } else {
    const blocksMatches = description.matchAll(BLOCKS_PHASE_REGEX);
    for (const m of blocksMatches) {
      blocks.push(parseInt(m[1] ?? '0', 10));
    }
  }

  // Extract parallel info
  const canRunParallelWith: number[] = [];
  const parallelToMatch = description.match(PARALLEL_TO_REGEX);

  if (parallelToMatch) {
    // "parallel to Phase 6/7" -> [6, 7]
    const phases = parallelToMatch[1]?.split('/') ?? [];
    for (const p of phases) {
      const num = parseInt(p.trim(), 10);
      if (!isNaN(num)) canRunParallelWith.push(num);
    }
  }

  return {
    phaseNumber,
    dependency: {
      shortName,
      dependsOn,
      blocks,
      canRunParallelWith,
      parallelTasks: [],
      description,
    },
  };
}

/**
 * Parse the parallel opportunities section and return a map of phase -> task IDs
 */
function parseParallelOpportunities(lines: string[]): Map<number, string[]> {
  const result = new Map<number, string[]>();

  for (const line of lines) {
    const match = line.match(PARALLEL_OPP_LINE_REGEX);
    if (match) {
      const phaseNumber = parseInt(match[1] ?? '0', 10);
      const description = match[2] ?? '';
      const tasks = extractParallelTasks(description);
      if (tasks.length > 0) {
        result.set(phaseNumber, tasks);
      }
    }
  }

  return result;
}

/**
 * Parse the dependencies section from tasks.md content
 * Returns a map of phase number to dependency info
 */
export function parseDependencies(content: string): Map<number, PhaseDependency> {
  const result = new Map<number, PhaseDependency>();
  const lines = content.split('\n');

  // Find the dependencies section
  const depSectionStart = lines.findIndex((l) => l.includes(DEPENDENCIES_SECTION_START));
  if (depSectionStart === -1) return result;

  // Find Phase Dependencies subsection
  const phaseDepsStart = lines.findIndex(
    (l, i) => i > depSectionStart && l.includes(PHASE_DEPENDENCIES_HEADER)
  );

  // Find Parallel Opportunities subsection
  const parallelOppStart = lines.findIndex(
    (l, i) => i > depSectionStart && l.includes(PARALLEL_OPPORTUNITIES_HEADER)
  );

  // Collect all phase numbers first (for "BLOCKS all" handling)
  const allPhaseNumbers: number[] = [];
  for (const line of lines) {
    const match = line.match(PHASE_DEP_LINE_REGEX);
    if (match) {
      allPhaseNumbers.push(parseInt(match[1] ?? '0', 10));
    }
  }

  // Parse Phase Dependencies section
  if (phaseDepsStart !== -1) {
    const endIndex = parallelOppStart !== -1 ? parallelOppStart : lines.length;
    for (let i = phaseDepsStart + 1; i < endIndex; i++) {
      const line = lines[i];
      // Stop at next section header
      if (line?.startsWith('###') || line?.startsWith('## ')) break;
      // Skip empty lines
      if (!line?.trim()) continue;

      const parsed = parsePhaseDependencyLine(line, allPhaseNumbers);
      if (parsed) {
        result.set(parsed.phaseNumber, parsed.dependency);
      }
    }
  }

  // Parse Parallel Opportunities section
  if (parallelOppStart !== -1) {
    const parallelLines: string[] = [];
    for (let i = parallelOppStart + 1; i < lines.length; i++) {
      const line = lines[i];
      // Stop at section separator or new section
      if (line?.startsWith('---') || line?.startsWith('## ')) break;
      // Skip empty lines but continue
      if (!line?.trim()) continue;
      parallelLines.push(line);
    }

    const parallelTasks = parseParallelOpportunities(parallelLines);

    // Merge parallel tasks into existing dependencies
    for (const [phaseNum, tasks] of parallelTasks) {
      const existing = result.get(phaseNum);
      if (existing) {
        existing.parallelTasks = tasks;
      } else {
        result.set(phaseNum, {
          shortName: '',
          dependsOn: [],
          blocks: [],
          canRunParallelWith: [],
          parallelTasks: tasks,
          description: '',
        });
      }
    }
  }

  // Build reverse relationships (if A depends on B, then B blocks A)
  for (const [phaseNum, dep] of result) {
    for (const dependsOnPhase of dep.dependsOn) {
      const blocker = result.get(dependsOnPhase);
      if (blocker && !blocker.blocks.includes(phaseNum)) {
        blocker.blocks.push(phaseNum);
      }
    }
  }

  // Sort blocks arrays
  for (const dep of result.values()) {
    dep.blocks.sort((a: number, b: number) => a - b);
  }

  return result;
}

/**
 * Calculate which phases can be started based on current completion status
 */
export function calculateAvailablePhases(
  phases: { number: number; isComplete: boolean; dependency?: PhaseDependency }[]
): number[] {
  const completedPhases = new Set(phases.filter((p) => p.isComplete).map((p) => p.number));

  const available: number[] = [];

  for (const phase of phases) {
    if (phase.isComplete) continue;

    const dep = phase.dependency;
    if (!dep || dep.dependsOn.length === 0) {
      // No dependencies, can start
      available.push(phase.number);
    } else {
      // Check if all dependencies are complete
      const allDepsComplete = dep.dependsOn.every((d: number) => completedPhases.has(d));
      if (allDepsComplete) {
        available.push(phase.number);
      }
    }
  }

  return available.sort((a: number, b: number) => a - b);
}
