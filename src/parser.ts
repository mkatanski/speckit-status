/**
 * Tasks.md file parser
 */

import { parseDependencies, calculateAvailablePhases } from './dependency-parser.js';
import { getSpecName } from './git-utils.js';
import type { Task, Phase, ParseResult } from './types.js';

// Phase header: "## Phase N: Title" or "## Phase N: Title (Priority: P?)"
const PHASE_HEADER_REGEX =
  /^##\s+Phase\s+(\d+):\s*(.+?)(?:\s*\(Priority:\s*(P\d)\))?$/;

// Task line: "- [X] T### rest of title" or "- [ ] T### rest of title"
const TASK_LINE_REGEX = /^-\s+\[(X| )\]\s+(T\d+)\s+(.*)$/;

/**
 * Parse a single task line
 */
function parseTaskLine(match: RegExpMatchArray): Task {
  const [, checkbox, id, title] = match;
  return {
    id: id ?? '',
    completed: checkbox === 'X',
    title: title?.trim() ?? '',
  };
}

/**
 * Finalize a phase by computing counts
 */
function finalizePhase(phase: Phase): Phase {
  const completedCount = phase.tasks.filter((t: Task) => t.completed).length;
  return {
    ...phase,
    completedCount,
    totalCount: phase.tasks.length,
    isComplete: completedCount === phase.tasks.length && phase.tasks.length > 0,
  };
}

/**
 * Parse tasks.md content and return structured data
 */
export function parseTasksFile(content: string, specFolder: string): ParseResult {
  const lines = content.split('\n');
  const phases: Phase[] = [];
  let currentPhase: Phase | null = null;

  for (const line of lines) {
    // Check for phase header
    const phaseMatch = line.match(PHASE_HEADER_REGEX);
    if (phaseMatch) {
      // Finalize previous phase if exists
      if (currentPhase) {
        phases.push(finalizePhase(currentPhase));
      }

      // Create new phase
      const [, number, title, priority] = phaseMatch;
      currentPhase = {
        number: parseInt(number ?? '0', 10),
        title: title?.trim() ?? '',
        tasks: [],
        completedCount: 0,
        totalCount: 0,
        isComplete: false,
        ...(priority !== undefined && { priority }),
      };
      continue;
    }

    // Check for task line
    const taskMatch = line.match(TASK_LINE_REGEX);
    if (taskMatch && currentPhase) {
      const task = parseTaskLine(taskMatch);
      currentPhase.tasks.push(task);
    }
  }

  // Don't forget the last phase
  if (currentPhase) {
    phases.push(finalizePhase(currentPhase));
  }

  // Parse dependencies and attach to phases
  const dependencies = parseDependencies(content);
  for (const phase of phases) {
    const dep = dependencies.get(phase.number);
    if (dep) {
      phase.dependency = dep;
    }
  }

  // Calculate totals
  const totalTasks = phases.reduce((sum, p) => sum + p.totalCount, 0);
  const completedTasks = phases.reduce((sum, p) => sum + p.completedCount, 0);

  // Find next phase (first incomplete phase)
  const nextPhase = phases.find((p) => !p.isComplete);

  // Calculate available phases (dependencies satisfied, not complete)
  const availablePhaseNumbers = calculateAvailablePhases(phases);
  const availablePhases = phases.filter(
    (p) => availablePhaseNumbers.includes(p.number) && !p.isComplete
  );

  return {
    specFolder,
    specName: getSpecName(specFolder),
    phases,
    totalTasks,
    completedTasks,
    availablePhases,
    ...(nextPhase !== undefined && { nextPhase }),
  };
}
