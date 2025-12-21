/**
 * Task Parser Type Definitions
 */

export interface Task {
  /** Task identifier (T001, T002, etc.) */
  id: string;
  /** Whether the task is completed */
  completed: boolean;
  /** Full task title including markers like [P], [US*], [shadcn:*], etc. */
  title: string;
}

export interface Phase {
  /** Phase number (1, 2, 3, etc.) */
  number: number;
  /** Phase title */
  title: string;
  /** Optional priority marker (P1, P2, etc.) */
  priority?: string;
  /** All tasks in this phase */
  tasks: Task[];
  /** Number of completed tasks */
  completedCount: number;
  /** Total number of tasks */
  totalCount: number;
  /** Whether all tasks are completed */
  isComplete: boolean;
  /** Dependency information for this phase */
  dependency?: PhaseDependency;
}

export interface PhaseDependency {
  /** Short name extracted from dependency section (e.g., "Setup", "US9 Navigation") */
  shortName: string;
  /** Phase numbers this phase depends on */
  dependsOn: number[];
  /** Phase numbers this phase blocks */
  blocks: number[];
  /** Phase numbers that can run in parallel with this one */
  canRunParallelWith: number[];
  /** Task IDs that can run in parallel within this phase */
  parallelTasks: string[];
  /** Raw description from the dependency section */
  description: string;
}

export interface ParseResult {
  /** Spec folder path */
  specFolder: string;
  /** Spec name derived from folder */
  specName: string;
  /** All phases parsed from the file */
  phases: Phase[];
  /** Total task count across all phases */
  totalTasks: number;
  /** Count of completed tasks */
  completedTasks: number;
  /** First incomplete phase (suggested next phase) */
  nextPhase?: Phase;
  /** First incomplete task in the next phase */
  nextTask?: Task;
  /** Phases that can be started now (dependencies satisfied) */
  availablePhases: Phase[];
}

export interface CLIOptions {
  /** Override spec folder (instead of git branch detection) */
  specFolder?: string;
  /** Output as JSON */
  json?: boolean;
  /** Show all tasks (including completed) */
  showAll?: boolean;
  /** Show only specific phase */
  phase?: number;
  /** Show help */
  help?: boolean;
  /** Output only next phase number (for clipboard) */
  next?: boolean;
}
