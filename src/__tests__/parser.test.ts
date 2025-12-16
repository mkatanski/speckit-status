/**
 * Tests for parser.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseTasksFile } from '../parser.js';
import * as gitUtils from '../git-utils.js';

// Mock git-utils
vi.mock('../git-utils.js', () => ({
  getSpecName: vi.fn((folder: string) => {
    const parts = folder.split(/[/\\]/);
    return parts[parts.length - 1] ?? 'unknown';
  }),
}));

describe('parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseTasksFile', () => {
    it('should parse a simple single-phase tasks file', () => {
      const content = `
## Phase 1: Setup

- [X] T001 Initialize project
- [ ] T002 Setup dependencies
- [X] T003 Configure build
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.specFolder).toBe('/path/to/spec');
      expect(result.specName).toBe('spec');
      expect(result.phases).toHaveLength(1);
      expect(result.phases[0]).toMatchObject({
        number: 1,
        title: 'Setup',
        totalCount: 3,
        completedCount: 2,
        isComplete: false,
      });
      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(2);
      expect(result.nextPhase?.number).toBe(1);
    });

    it('should parse multiple phases correctly', () => {
      const content = `
## Phase 1: Setup

- [X] T001 Task one
- [X] T002 Task two

## Phase 2: Development

- [ ] T003 Task three
- [ ] T004 Task four

## Phase 3: Testing

- [ ] T005 Task five
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases).toHaveLength(3);
      expect(result.phases[0]?.isComplete).toBe(true);
      expect(result.phases[1]?.isComplete).toBe(false);
      expect(result.totalTasks).toBe(5);
      expect(result.completedTasks).toBe(2);
      expect(result.nextPhase?.number).toBe(2);
    });

    it('should parse phase with priority marker', () => {
      const content = `
## Phase 1: Critical Setup (Priority: P1)

- [ ] T001 Important task
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.priority).toBe('P1');
      expect(result.phases[0]?.title).toBe('Critical Setup');
    });

    it('should handle phase without priority marker', () => {
      const content = `
## Phase 1: Normal Setup

- [ ] T001 Regular task
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.priority).toBeUndefined();
      expect(result.phases[0]?.title).toBe('Normal Setup');
    });

    it('should parse task IDs and titles correctly', () => {
      const content = `
## Phase 1: Test

- [X] T001 First task
- [ ] T099 Task ninety-nine
- [X] T123 Task with [brackets] and (parens)
`;

      const result = parseTasksFile(content, '/path/to/spec');
      const tasks = result.phases[0]?.tasks;

      expect(tasks).toHaveLength(3);
      expect(tasks?.[0]).toMatchObject({
        id: 'T001',
        completed: true,
        title: 'First task',
      });
      expect(tasks?.[1]).toMatchObject({
        id: 'T099',
        completed: false,
        title: 'Task ninety-nine',
      });
      expect(tasks?.[2]).toMatchObject({
        id: 'T123',
        completed: true,
        title: 'Task with [brackets] and (parens)',
      });
    });

    it('should handle empty phases correctly', () => {
      const content = `
## Phase 1: Empty Phase

## Phase 2: With Tasks

- [ ] T001 A task
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases).toHaveLength(2);
      expect(result.phases[0]?.tasks).toHaveLength(0);
      expect(result.phases[0]?.isComplete).toBe(false);
      expect(result.phases[1]?.tasks).toHaveLength(1);
    });

    it('should handle empty content', () => {
      const content = '';

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases).toHaveLength(0);
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.nextPhase).toBeUndefined();
    });

    it('should handle content with no phases', () => {
      const content = `
# Some Title

This is just random text.

- Not a task line
- Also not a task
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases).toHaveLength(0);
      expect(result.totalTasks).toBe(0);
    });

    it('should handle all completed phases', () => {
      const content = `
## Phase 1: Done

- [X] T001 Task one

## Phase 2: Also Done

- [X] T002 Task two
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases).toHaveLength(2);
      expect(result.completedTasks).toBe(2);
      expect(result.totalTasks).toBe(2);
      expect(result.nextPhase).toBeUndefined();
    });

    it('should calculate available phases correctly with no dependencies', () => {
      const content = `
## Phase 1: First

- [ ] T001 Task one

## Phase 2: Second

- [ ] T002 Task two
`;

      const result = parseTasksFile(content, '/path/to/spec');

      // Without dependencies, all incomplete phases are available
      expect(result.availablePhases).toHaveLength(2);
      expect(result.availablePhases.map((p) => p.number)).toEqual([1, 2]);
    });

    it('should handle malformed task lines gracefully', () => {
      const content = `
## Phase 1: Test

- [X] T001 Valid task
- [ ] Not a valid task line
-[X]T002 Missing space
- [X] Missing task ID
`;

      const result = parseTasksFile(content, '/path/to/spec');

      // Only the valid task should be parsed
      expect(result.phases[0]?.tasks).toHaveLength(1);
      expect(result.phases[0]?.tasks[0]?.id).toBe('T001');
    });

    it('should handle task titles with special markers', () => {
      const content = `
## Phase 1: Test

- [X] T001 [P] High priority task
- [ ] T002 [US*] User story task
- [X] T003 [shadcn:button] Component task
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.tasks).toHaveLength(3);
      expect(result.phases[0]?.tasks[0]?.title).toBe('[P] High priority task');
      expect(result.phases[0]?.tasks[1]?.title).toBe('[US*] User story task');
      expect(result.phases[0]?.tasks[2]?.title).toBe('[shadcn:button] Component task');
    });

    it('should parse phases with dependencies section', () => {
      const content = `
## Phase 1: Setup

- [X] T001 Task one

## Phase 2: Development

- [ ] T002 Task two

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Development)**: Depends on Phase 1
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.dependency).toBeDefined();
      expect(result.phases[0]?.dependency?.shortName).toBe('Setup');
      expect(result.phases[1]?.dependency).toBeDefined();
      expect(result.phases[1]?.dependency?.shortName).toBe('Development');
      expect(result.phases[1]?.dependency?.dependsOn).toEqual([1]);
    });

    it('should handle phases with parallel tasks', () => {
      const content = `
## Phase 1: Setup

- [ ] T001 Task one
- [ ] T002 Task two

## Dependencies & Execution Order

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T002 can run in parallel
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.dependency?.parallelTasks).toEqual(['T001', 'T002']);
    });

    it('should trim whitespace from phase titles', () => {
      const content = `
## Phase 1:   Setup with spaces

- [ ] T001 Task
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.title).toBe('Setup with spaces');
    });

    it('should trim whitespace from task titles', () => {
      const content = `
## Phase 1: Test

- [ ] T001    Task with trailing spaces
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.tasks[0]?.title).toBe('Task with trailing spaces');
    });

    it('should handle phase numbers with multiple digits', () => {
      const content = `
## Phase 10: Tenth Phase

- [ ] T001 Task one

## Phase 25: Twenty-fifth Phase

- [ ] T002 Task two
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases).toHaveLength(2);
      expect(result.phases[0]?.number).toBe(10);
      expect(result.phases[1]?.number).toBe(25);
    });

    it('should handle task IDs with varying digit counts', () => {
      const content = `
## Phase 1: Test

- [ ] T1 Single digit (invalid format)
- [ ] T01 Two digits (invalid format)
- [X] T001 Three digits (valid)
- [X] T1234 Four digits (valid)
`;

      const result = parseTasksFile(content, '/path/to/spec');

      // All T### patterns should be captured
      expect(result.phases[0]?.tasks).toHaveLength(4);
      expect(result.phases[0]?.tasks.map((t) => t.id)).toEqual(['T1', 'T01', 'T001', 'T1234']);
    });

    it('should call getSpecName with correct folder path', () => {
      const content = `## Phase 1: Test\n- [ ] T001 Task`;
      const specFolder = '/some/path/to/my-spec';

      parseTasksFile(content, specFolder);

      expect(gitUtils.getSpecName).toHaveBeenCalledWith(specFolder);
    });

    it('should handle completed phase with empty tasks list', () => {
      const content = `
## Phase 1: Empty Completed

`;

      const result = parseTasksFile(content, '/path/to/spec');

      // Empty phase should not be considered complete
      expect(result.phases[0]?.isComplete).toBe(false);
      expect(result.phases[0]?.completedCount).toBe(0);
      expect(result.phases[0]?.totalCount).toBe(0);
    });

    it('should handle phase that becomes complete mid-parsing', () => {
      const content = `
## Phase 1: First

- [X] T001 Done
- [X] T002 Done

## Phase 2: Second

- [ ] T003 Not done

## Phase 3: Third

- [X] T004 Done
- [X] T005 Done
`;

      const result = parseTasksFile(content, '/path/to/spec');

      expect(result.phases[0]?.isComplete).toBe(true);
      expect(result.phases[1]?.isComplete).toBe(false);
      expect(result.phases[2]?.isComplete).toBe(true);
      expect(result.nextPhase?.number).toBe(2);
    });
  });
});
