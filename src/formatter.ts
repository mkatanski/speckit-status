/**
 * Terminal output formatter with colors
 */

import type { Phase, ParseResult, CLIOptions, Task } from './types.js';

// ANSI color codes
const COLORS = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

// Box drawing characters for dependency tree
const BOX = {
  vertical: '\u2502', // │
  horizontal: '\u2500', // ─
  corner: '\u2514', // └
  tee: '\u251C', // ├
  arrow: '\u2192', // →
  check: '\u2713', // ✓
  bullet: '\u2022', // •
} as const;

/**
 * Format a progress bar
 */
function formatProgressBar(completed: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? completed / total : 0;
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  return bar;
}

/**
 * Format a single phase status line with dependency indicator
 */
function formatPhaseStatus(phase: Phase, phases: Phase[], showDeps: boolean = true): string {
  const statusColor = phase.isComplete ? COLORS.green : COLORS.yellow;
  const checkmark = phase.isComplete ? ` ${BOX.check}` : '';

  let depIndicator = '';
  if (showDeps && phase.dependency && !phase.isComplete) {
    const dep = phase.dependency;
    if (dep.dependsOn.length > 0) {
      const blockedBy = dep.dependsOn.filter((d: number) => {
        const depPhase = phases.find((p: Phase) => p.number === d);
        return depPhase && !depPhase.isComplete;
      });
      if (blockedBy.length > 0) {
        depIndicator = ` ${COLORS.red}[blocked by ${blockedBy.map((d: number) => `P${d}`).join(', ')}]${COLORS.reset}`;
      }
    }
  }

  return `${statusColor}Phase ${phase.number}:${COLORS.reset} ${phase.title} ${COLORS.dim}[${phase.completedCount}/${phase.totalCount}]${COLORS.reset}${statusColor}${checkmark}${COLORS.reset}${depIndicator}`;
}

/**
 * Format a single task line
 */
function formatTaskLine(task: { id: string; completed: boolean; title: string }): string {
  const checkbox = task.completed
    ? `${COLORS.green}[\u2713]${COLORS.reset}`
    : `${COLORS.dim}[ ]${COLORS.reset}`;

  const titleColor = task.completed ? COLORS.dim : '';
  const titleReset = task.completed ? COLORS.reset : '';

  return `  ${checkbox} ${COLORS.cyan}${task.id}${COLORS.reset} ${titleColor}${task.title}${titleReset}`;
}

/**
 * Format dependency info for a phase
 */
function formatPhaseDependencyInfo(phase: Phase, phases: Phase[]): string[] {
  const lines: string[] = [];
  const dep = phase.dependency;
  if (!dep) return lines;

  // Dependencies (what this phase depends on)
  if (dep.dependsOn.length > 0) {
    const depStatus = dep.dependsOn.map((d: number) => {
      const depPhase = phases.find((p: Phase) => p.number === d);
      const isComplete = depPhase?.isComplete ?? false;
      const status = isComplete
        ? `${COLORS.green}${BOX.check}${COLORS.reset}`
        : `${COLORS.yellow}...${COLORS.reset}`;
      const name = depPhase?.dependency?.shortName ?? depPhase?.title ?? '';
      return `P${d} ${COLORS.dim}(${name})${COLORS.reset} ${status}`;
    });
    lines.push(
      `  ${COLORS.dim}${BOX.tee}${BOX.horizontal} Depends on:${COLORS.reset} ${depStatus.join(', ')}`
    );
  }

  // What this phase blocks
  if (dep.blocks.length > 0) {
    const blockNames = dep.blocks.map((b: number) => {
      const blockPhase = phases.find((p: Phase) => p.number === b);
      const name = blockPhase?.dependency?.shortName ?? '';
      return `P${b}${name ? ` ${COLORS.dim}(${name})${COLORS.reset}` : ''}`;
    });
    lines.push(
      `  ${COLORS.dim}${BOX.tee}${BOX.horizontal} Blocks:${COLORS.reset} ${blockNames.join(', ')}`
    );
  }

  // Parallel tasks within this phase
  if (dep.parallelTasks.length > 0) {
    const taskList =
      dep.parallelTasks.length > 6
        ? `${dep.parallelTasks.slice(0, 6).join(', ')}... (${dep.parallelTasks.length} total)`
        : dep.parallelTasks.join(', ');
    lines.push(
      `  ${COLORS.dim}${BOX.corner}${BOX.horizontal} Parallel tasks:${COLORS.reset} ${COLORS.cyan}${taskList}${COLORS.reset}`
    );
  }

  return lines;
}

/**
 * Format the complete output for terminal display
 */
export function formatOutput(result: ParseResult, options: CLIOptions): void {
  const { specName, phases, totalTasks, completedTasks, nextPhase, availablePhases } = result;

  // Header
  console.log();
  console.log(`${COLORS.bold}${specName}${COLORS.reset} ${COLORS.dim}Tasks${COLORS.reset}`);
  console.log('='.repeat(specName.length + 6));
  console.log();

  // Progress summary
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressBar = formatProgressBar(completedTasks, totalTasks);
  const progressColor =
    percentage === 100 ? COLORS.green : percentage >= 50 ? COLORS.yellow : COLORS.red;

  console.log(
    `${COLORS.bold}Progress:${COLORS.reset} ${progressColor}${progressBar}${COLORS.reset} ${completedTasks}/${totalTasks} (${percentage}%)`
  );
  console.log();

  // Phase list
  if (options.phase !== undefined) {
    // Show specific phase with full details
    const phase = phases.find((p: Phase) => p.number === options.phase);
    if (phase) {
      console.log(formatPhaseStatus(phase, phases, false));

      // Show dependency info
      const depInfo = formatPhaseDependencyInfo(phase, phases);
      depInfo.forEach((line: string) => console.log(line));

      console.log();
      phase.tasks.forEach((task: Task) => {
        if (options.showAll ?? !task.completed) {
          console.log(formatTaskLine(task));
        }
      });
    } else {
      console.log(`${COLORS.red}Phase ${options.phase} not found${COLORS.reset}`);
    }
  } else {
    // Show all phases summary
    phases.forEach((phase: Phase) => {
      console.log(formatPhaseStatus(phase, phases));
    });
  }

  console.log();

  // Next phase recommendation
  if (nextPhase && options.phase === undefined) {
    console.log(
      `${COLORS.bold}Next Phase:${COLORS.reset} ${COLORS.cyan}Phase ${nextPhase.number}${COLORS.reset} - ${nextPhase.title}`
    );

    // Show dependency info for next phase
    const depInfo = formatPhaseDependencyInfo(nextPhase, phases);
    depInfo.forEach((line: string) => console.log(line));

    // Show first pending task
    const firstPending = nextPhase.tasks.find((t: Task) => !t.completed);
    if (firstPending) {
      console.log(
        `  ${COLORS.dim}Start with:${COLORS.reset} ${COLORS.cyan}${firstPending.id}${COLORS.reset} ${firstPending.title}`
      );
    }
    console.log();

    // Show other available phases (can run in parallel)
    const otherAvailable = availablePhases.filter((p: Phase) => p.number !== nextPhase.number);
    if (otherAvailable.length > 0) {
      console.log(
        `${COLORS.bold}Can Run in Parallel:${COLORS.reset} ${COLORS.dim}(dependencies satisfied)${COLORS.reset}`
      );
      otherAvailable.forEach((phase: Phase) => {
        const depOn = phase.dependency?.dependsOn ?? [];
        const afterInfo =
          depOn.length > 0 ? ` ${COLORS.dim}(after P${depOn.join(', P')})${COLORS.reset}` : '';
        console.log(
          `  ${COLORS.magenta}${BOX.bullet}${COLORS.reset} Phase ${phase.number}: ${phase.dependency?.shortName ?? phase.title}${afterInfo}`
        );
      });
      console.log();
    }
  } else if (!nextPhase && options.phase === undefined) {
    console.log(`${COLORS.green}${COLORS.bold}${BOX.check} All phases complete!${COLORS.reset}`);
    console.log();
  }
}

/**
 * Format output as JSON
 */
export function formatJSON(result: ParseResult): void {
  console.log(JSON.stringify(result, null, 2));
}
