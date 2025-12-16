/**
 * Tests for formatter.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { formatOutput, formatJSON } from '../formatter.js';
import type { ParseResult, CLIOptions, Phase } from '../types.js';

type ConsoleLogMock = MockInstance<typeof console.log>;
type MockCall = [string | undefined];

function getOutputFromCalls(spy: ConsoleLogMock): string {
  const calls = spy.mock.calls as MockCall[];
  return calls.map((call) => call[0] ?? '').join('\n');
}

describe('formatter', () => {
  let consoleLogSpy: ConsoleLogMock;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('formatJSON', () => {
    it('should output result as JSON', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: true, title: 'Task one' },
              { id: 'T002', completed: false, title: 'Task two' },
            ],
            completedCount: 1,
            totalCount: 2,
            isComplete: false,
          },
        ],
        totalTasks: 2,
        completedTasks: 1,
        nextPhase: {
          number: 1,
          title: 'Setup',
          tasks: [
            { id: 'T001', completed: true, title: 'Task one' },
            { id: 'T002', completed: false, title: 'Task two' },
          ],
          completedCount: 1,
          totalCount: 2,
          isComplete: false,
        },
        availablePhases: [],
      };

      formatJSON(result);

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const output = getOutputFromCalls(consoleLogSpy);
      expect(typeof output).toBe('string');

      const parsed = JSON.parse(output) as ParseResult;
      expect(parsed.specName).toBe('test-spec');
      expect(parsed.phases).toHaveLength(1);
      expect(parsed.totalTasks).toBe(2);
    });

    it('should handle empty result', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'empty-spec',
        phases: [],
        totalTasks: 0,
        completedTasks: 0,
        availablePhases: [],
      };

      formatJSON(result);

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const output = getOutputFromCalls(consoleLogSpy);
      const parsed = JSON.parse(output) as ParseResult;
      expect(parsed.phases).toEqual([]);
      expect(parsed.totalTasks).toBe(0);
    });
  });

  describe('formatOutput', () => {
    it('should output spec name and progress', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: true, title: 'Task one' },
              { id: 'T002', completed: false, title: 'Task two' },
            ],
            completedCount: 1,
            totalCount: 2,
            isComplete: false,
          },
        ],
        totalTasks: 2,
        completedTasks: 1,
        nextPhase: {
          number: 1,
          title: 'Setup',
          tasks: [
            { id: 'T001', completed: true, title: 'Task one' },
            { id: 'T002', completed: false, title: 'Task two' },
          ],
          completedCount: 1,
          totalCount: 2,
          isComplete: false,
        },
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('test-spec');
      expect(output).toContain('1/2');
      expect(output).toContain('50%');
    });

    it('should display all phases summary by default', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'multi-phase',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [{ id: 'T001', completed: true, title: 'Task one' }],
            completedCount: 1,
            totalCount: 1,
            isComplete: true,
          },
          {
            number: 2,
            title: 'Development',
            tasks: [{ id: 'T002', completed: false, title: 'Task two' }],
            completedCount: 0,
            totalCount: 1,
            isComplete: false,
          },
        ],
        totalTasks: 2,
        completedTasks: 1,
        nextPhase: {
          number: 2,
          title: 'Development',
          tasks: [{ id: 'T002', completed: false, title: 'Task two' }],
          completedCount: 0,
          totalCount: 1,
          isComplete: false,
        },
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('Phase 1');
      expect(output).toContain('Setup');
      expect(output).toContain('Phase 2');
      expect(output).toContain('Development');
    });

    it('should show specific phase when phase option is provided', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: true, title: 'Task one' },
              { id: 'T002', completed: false, title: 'Task two' },
            ],
            completedCount: 1,
            totalCount: 2,
            isComplete: false,
          },
          {
            number: 2,
            title: 'Development',
            tasks: [{ id: 'T003', completed: false, title: 'Task three' }],
            completedCount: 0,
            totalCount: 1,
            isComplete: false,
          },
        ],
        totalTasks: 3,
        completedTasks: 1,
        availablePhases: [],
      };

      const options: CLIOptions = { phase: 1 };

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      // By default, only incomplete tasks are shown, so T001 (completed) won't appear
      expect(output).toContain('T002');
      expect(output).not.toContain('T003');
    });

    it('should show only incomplete tasks by default', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: true, title: 'Task one' },
              { id: 'T002', completed: false, title: 'Task two' },
            ],
            completedCount: 1,
            totalCount: 2,
            isComplete: false,
          },
        ],
        totalTasks: 2,
        completedTasks: 1,
        availablePhases: [],
      };

      const options: CLIOptions = { phase: 1 };

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('T002');
      expect(output).toContain('Task two');
    });

    it('should show all tasks when showAll option is true', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: true, title: 'Task one' },
              { id: 'T002', completed: false, title: 'Task two' },
            ],
            completedCount: 1,
            totalCount: 2,
            isComplete: false,
          },
        ],
        totalTasks: 2,
        completedTasks: 1,
        availablePhases: [],
      };

      const options: CLIOptions = { phase: 1, showAll: true };

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('T001');
      expect(output).toContain('T002');
    });

    it('should show next phase recommendation', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [{ id: 'T001', completed: false, title: 'First task' }],
            completedCount: 0,
            totalCount: 1,
            isComplete: false,
          },
        ],
        totalTasks: 1,
        completedTasks: 0,
        nextPhase: {
          number: 1,
          title: 'Setup',
          tasks: [{ id: 'T001', completed: false, title: 'First task' }],
          completedCount: 0,
          totalCount: 1,
          isComplete: false,
        },
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('Next Phase');
      expect(output).toContain('Phase 1');
      expect(output).toContain('Setup');
    });

    it('should show completion message when all phases complete', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [{ id: 'T001', completed: true, title: 'Task one' }],
            completedCount: 1,
            totalCount: 1,
            isComplete: true,
          },
        ],
        totalTasks: 1,
        completedTasks: 1,
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('All phases complete');
    });

    it('should show parallel execution options', () => {
      const phase1: Phase = {
        number: 1,
        title: 'Setup',
        tasks: [{ id: 'T001', completed: false, title: 'Task one' }],
        completedCount: 0,
        totalCount: 1,
        isComplete: false,
      };

      const phase2: Phase = {
        number: 2,
        title: 'Frontend',
        tasks: [{ id: 'T002', completed: false, title: 'Task two' }],
        completedCount: 0,
        totalCount: 1,
        isComplete: false,
        dependency: {
          shortName: 'Frontend',
          dependsOn: [],
          blocks: [],
          canRunParallelWith: [],
          parallelTasks: [],
          description: '',
        },
      };

      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [phase1, phase2],
        totalTasks: 2,
        completedTasks: 0,
        nextPhase: phase1,
        availablePhases: [phase1, phase2],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('Can Run in Parallel');
    });

    it('should show dependency information for phases', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [{ id: 'T001', completed: true, title: 'Task one' }],
            completedCount: 1,
            totalCount: 1,
            isComplete: true,
            dependency: {
              shortName: 'Setup',
              dependsOn: [],
              blocks: [2],
              canRunParallelWith: [],
              parallelTasks: [],
              description: '',
            },
          },
          {
            number: 2,
            title: 'Development',
            tasks: [{ id: 'T002', completed: false, title: 'Task two' }],
            completedCount: 0,
            totalCount: 1,
            isComplete: false,
            dependency: {
              shortName: 'Dev',
              dependsOn: [1],
              blocks: [],
              canRunParallelWith: [],
              parallelTasks: [],
              description: '',
            },
          },
        ],
        totalTasks: 2,
        completedTasks: 1,
        nextPhase: {
          number: 2,
          title: 'Development',
          tasks: [{ id: 'T002', completed: false, title: 'Task two' }],
          completedCount: 0,
          totalCount: 1,
          isComplete: false,
          dependency: {
            shortName: 'Dev',
            dependsOn: [1],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: [],
            description: '',
          },
        },
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('Depends on');
    });

    it('should show blocked status for phases with unmet dependencies', () => {
      const phase1: Phase = {
        number: 1,
        title: 'Setup',
        tasks: [{ id: 'T001', completed: false, title: 'Task one' }],
        completedCount: 0,
        totalCount: 1,
        isComplete: false,
        dependency: {
          shortName: 'Setup',
          dependsOn: [],
          blocks: [2],
          canRunParallelWith: [],
          parallelTasks: [],
          description: '',
        },
      };

      const phase2: Phase = {
        number: 2,
        title: 'Development',
        tasks: [{ id: 'T002', completed: false, title: 'Task two' }],
        completedCount: 0,
        totalCount: 1,
        isComplete: false,
        dependency: {
          shortName: 'Dev',
          dependsOn: [1],
          blocks: [],
          canRunParallelWith: [],
          parallelTasks: [],
          description: '',
        },
      };

      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [phase1, phase2],
        totalTasks: 2,
        completedTasks: 0,
        nextPhase: phase1,
        availablePhases: [phase1],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('blocked by');
    });

    it('should show parallel tasks information', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: false, title: 'Task one' },
              { id: 'T002', completed: false, title: 'Task two' },
            ],
            completedCount: 0,
            totalCount: 2,
            isComplete: false,
            dependency: {
              shortName: 'Setup',
              dependsOn: [],
              blocks: [],
              canRunParallelWith: [],
              parallelTasks: ['T001', 'T002'],
              description: '',
            },
          },
        ],
        totalTasks: 2,
        completedTasks: 0,
        nextPhase: {
          number: 1,
          title: 'Setup',
          tasks: [
            { id: 'T001', completed: false, title: 'Task one' },
            { id: 'T002', completed: false, title: 'Task two' },
          ],
          completedCount: 0,
          totalCount: 2,
          isComplete: false,
          dependency: {
            shortName: 'Setup',
            dependsOn: [],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: ['T001', 'T002'],
            description: '',
          },
        },
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('Parallel tasks');
      expect(output).toContain('T001');
    });

    it('should truncate long parallel task lists', () => {
      const manyTasks = Array.from({ length: 20 }, (_, i) => `T${String(i + 1).padStart(3, '0')}`);

      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [],
            completedCount: 0,
            totalCount: 0,
            isComplete: false,
            dependency: {
              shortName: 'Setup',
              dependsOn: [],
              blocks: [],
              canRunParallelWith: [],
              parallelTasks: manyTasks,
              description: '',
            },
          },
        ],
        totalTasks: 0,
        completedTasks: 0,
        availablePhases: [],
      };

      const options: CLIOptions = { phase: 1 };

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('20 total');
    });

    it('should handle phase not found error', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [],
            completedCount: 0,
            totalCount: 0,
            isComplete: false,
          },
        ],
        totalTasks: 0,
        completedTasks: 0,
        availablePhases: [],
      };

      const options: CLIOptions = { phase: 99 };

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('Phase 99 not found');
    });

    it('should calculate correct progress percentage', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'test-spec',
        phases: [
          {
            number: 1,
            title: 'Setup',
            tasks: [
              { id: 'T001', completed: true, title: 'Task one' },
              { id: 'T002', completed: true, title: 'Task two' },
              { id: 'T003', completed: true, title: 'Task three' },
              { id: 'T004', completed: false, title: 'Task four' },
            ],
            completedCount: 3,
            totalCount: 4,
            isComplete: false,
          },
        ],
        totalTasks: 4,
        completedTasks: 3,
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('75%');
    });

    it('should handle zero total tasks', () => {
      const result: ParseResult = {
        specFolder: '/path/to/spec',
        specName: 'empty-spec',
        phases: [],
        totalTasks: 0,
        completedTasks: 0,
        availablePhases: [],
      };

      const options: CLIOptions = {};

      formatOutput(result, options);

      const output = getOutputFromCalls(consoleLogSpy);

      expect(output).toContain('0/0');
      expect(output).toContain('0%');
    });
  });
});
