/**
 * Tests for dependency-parser.ts
 */

import { describe, it, expect } from 'vitest';
import { parseDependencies, calculateAvailablePhases } from '../dependency-parser.js';
import type { PhaseDependency } from '../types.js';

describe('dependency-parser', () => {
  describe('parseDependencies', () => {
    it('should return empty map when no dependencies section exists', () => {
      const content = `
## Phase 1: Setup

- [ ] T001 Task one
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(0);
    });

    it('should parse simple phase dependency', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(1);
      const dep = result.get(1);
      expect(dep).toBeDefined();
      expect(dep?.shortName).toBe('Setup');
      expect(dep?.dependsOn).toEqual([]);
      expect(dep?.blocks).toEqual([]);
      expect(dep?.description).toContain('No dependencies');
    });

    it('should parse phase with single dependency', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Development)**: Depends on Phase 1
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(2);
      const phase2 = result.get(2);
      expect(phase2?.dependsOn).toEqual([1]);
      expect(phase2?.shortName).toBe('Development');
    });

    it('should parse phase with multiple dependencies', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Config)**: No dependencies
- **Phase 3 (Build)**: Depends on Phase 1 and Depends on Phase 2
`;

      const result = parseDependencies(content);

      const phase3 = result.get(3);
      expect(phase3?.dependsOn).toEqual([1, 2]);
    });

    it('should parse "Depends on all" pattern', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Config)**: No dependencies
- **Phase 3 (Final)**: Depends on all previous phases
`;

      const result = parseDependencies(content);

      const phase3 = result.get(3);
      expect(phase3?.dependsOn).toEqual([1, 2]);
    });

    it('should parse BLOCKS all pattern', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Critical)**: BLOCKS all other phases
- **Phase 2 (Other)**: No dependencies
- **Phase 3 (More)**: No dependencies
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.blocks).toEqual([2, 3]);
    });

    it('should parse specific blocks Phase pattern', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Blocks Phase 2
- **Phase 2 (Dev)**: No dependencies
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.blocks).toContain(2);
    });

    it('should parse multiple blocks', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Blocks Phase 2 and Blocks Phase 3
- **Phase 2 (Dev)**: No dependencies
- **Phase 3 (Test)**: No dependencies
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.blocks).toEqual([2, 3]);
    });

    it('should parse parallel to phases', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Frontend)**: Can run parallel to Phase 2
- **Phase 2 (Backend)**: Can run parallel to Phase 1
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.canRunParallelWith).toEqual([2]);
    });

    it('should parse multiple parallel phases', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 5 (Testing)**: Can run parallel to Phase 6/7
`;

      const result = parseDependencies(content);

      const phase5 = result.get(5);
      expect(phase5?.canRunParallelWith).toEqual([6, 7]);
    });

    it('should parse parallel opportunities section', () => {
      const content = `
## Dependencies & Execution Order

### Parallel Opportunities

**Phase 1 (Setup)**: T002-T018 can mostly run in parallel
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.parallelTasks).toHaveLength(17); // T002 through T018
      expect(phase1?.parallelTasks[0]).toBe('T002');
      expect(phase1?.parallelTasks[phase1.parallelTasks.length - 1]).toBe('T018');
    });

    it('should parse parallel tasks with ranges and individual IDs', () => {
      const content = `
## Dependencies & Execution Order

### Parallel Opportunities

**Phase 1 (Setup)**: T002-T005, T010, T015-T017 can run in parallel
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.parallelTasks).toContain('T002');
      expect(phase1?.parallelTasks).toContain('T005');
      expect(phase1?.parallelTasks).toContain('T010');
      expect(phase1?.parallelTasks).toContain('T015');
      expect(phase1?.parallelTasks).toContain('T017');
    });

    it('should deduplicate parallel tasks', () => {
      const content = `
## Dependencies & Execution Order

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T003, T002, T003 mentioned multiple times
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      const taskSet = new Set(phase1?.parallelTasks);
      expect(taskSet.size).toBe(phase1?.parallelTasks.length ?? 0);
    });

    it('should merge dependency and parallel opportunity data', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T005 can run in parallel
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.shortName).toBe('Setup');
      expect(phase1?.dependsOn).toEqual([]);
      expect(phase1?.parallelTasks).toHaveLength(5);
    });

    it('should build reverse relationships (blocks from depends on)', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Development)**: Depends on Phase 1
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.blocks).toContain(2);
    });

    it('should handle phases with no parallel opportunities', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies

### Parallel Opportunities

**Phase 2 (Other)**: T001-T005 can run in parallel
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.parallelTasks).toEqual([]);
    });

    it('should handle parallel opportunities without phase dependencies', () => {
      const content = `
## Dependencies & Execution Order

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T005 can run in parallel
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.parallelTasks).toHaveLength(5);
      expect(phase1?.shortName).toBe('');
      expect(phase1?.dependsOn).toEqual([]);
    });

    it('should handle empty lines in dependencies section', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies

- **Phase 2 (Dev)**: Depends on Phase 1
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(2);
      expect(result.get(1)).toBeDefined();
      expect(result.get(2)).toBeDefined();
    });

    it('should stop parsing at section separators', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies

---

This is after the separator and should be ignored
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(1);
    });

    it('should handle complex real-world example', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies, BLOCKS all other phases
- **Phase 2 (US9 Navigation)**: Depends on Phase 1, Can run parallel to Phase 3/4
- **Phase 3 (US10 Listings)**: Depends on Phase 1, Can run parallel to Phase 2/4
- **Phase 4 (US11 Details)**: Depends on Phase 1, Can run parallel to Phase 2/3

### Parallel Opportunities

**Phase 1 (Setup)**: T002-T018 can mostly run in parallel after T001
**Phase 2 (US9 Navigation)**: T019-T033 can run in any order
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(4);

      const phase1 = result.get(1);
      expect(phase1?.shortName).toBe('Setup');
      expect(phase1?.blocks).toEqual([2, 3, 4]);
      // T002-T018 includes T001 from the description, so it's 18 tasks total (T001-T018)
      expect(phase1?.parallelTasks.length).toBeGreaterThanOrEqual(17);

      const phase2 = result.get(2);
      expect(phase2?.dependsOn).toEqual([1]);
      expect(phase2?.canRunParallelWith).toEqual([3, 4]);
      expect(phase2?.parallelTasks).toHaveLength(15);
    });

    it('should handle malformed phase dependency lines', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Valid line
- Not a valid phase line
- **Invalid**: Missing phase number
`;

      const result = parseDependencies(content);

      expect(result.size).toBe(1);
      expect(result.get(1)).toBeDefined();
    });

    it('should sort blocks arrays', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 3 (Third)**: Depends on Phase 1
- **Phase 2 (Second)**: Depends on Phase 1
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.blocks).toEqual([2, 3]);
    });

    it('should handle case variations in keywords', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: depends on all previous phases
- **Phase 2 (Dev)**: BLOCKS ALL subsequent phases
- **Phase 3 (Test)**: Depends on Phase 1
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.dependsOn).toEqual([]);

      const phase2 = result.get(2);
      expect(phase2?.blocks.length).toBeGreaterThan(0);
    });

    it('should preserve original description text', () => {
      const content = `
## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: This is a longer description with Depends on Phase 2 embedded
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.description).toBe(
        'This is a longer description with Depends on Phase 2 embedded'
      );
    });

    it('should handle task IDs with proper padding', () => {
      const content = `
## Dependencies & Execution Order

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T003 and T099-T101 can run in parallel
`;

      const result = parseDependencies(content);

      const phase1 = result.get(1);
      expect(phase1?.parallelTasks).toContain('T001');
      expect(phase1?.parallelTasks).toContain('T099');
      expect(phase1?.parallelTasks).toContain('T100');
      expect(phase1?.parallelTasks).toContain('T101');
    });
  });

  describe('calculateAvailablePhases', () => {
    it('should return all phases when none have dependencies', () => {
      const phases = [
        { number: 1, isComplete: false },
        { number: 2, isComplete: false },
        { number: 3, isComplete: false },
      ];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should exclude completed phases', () => {
      const phases = [
        { number: 1, isComplete: true },
        { number: 2, isComplete: false },
        { number: 3, isComplete: false },
      ];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([2, 3]);
    });

    it('should respect phase dependencies', () => {
      const phases = [
        { number: 1, isComplete: false },
        {
          number: 2,
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
      ];

      const result = calculateAvailablePhases(phases);

      // Phase 2 depends on Phase 1, which is not complete
      expect(result).toEqual([1]);
    });

    it('should allow phase when dependencies are satisfied', () => {
      const phases = [
        { number: 1, isComplete: true },
        {
          number: 2,
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
      ];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([2]);
    });

    it('should handle multiple dependencies', () => {
      const phases = [
        { number: 1, isComplete: true },
        { number: 2, isComplete: true },
        {
          number: 3,
          isComplete: false,
          dependency: {
            shortName: 'Final',
            dependsOn: [1, 2],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: [],
            description: '',
          },
        },
      ];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([3]);
    });

    it('should block phase when not all dependencies are met', () => {
      const phases = [
        { number: 1, isComplete: true },
        { number: 2, isComplete: false },
        {
          number: 3,
          isComplete: false,
          dependency: {
            shortName: 'Final',
            dependsOn: [1, 2],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: [],
            description: '',
          },
        },
      ];

      const result = calculateAvailablePhases(phases);

      // Phase 3 depends on both 1 and 2, but 2 is not complete
      expect(result).toEqual([2]);
    });

    it('should handle empty phases array', () => {
      const phases: { number: number; isComplete: boolean; dependency?: PhaseDependency }[] = [];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([]);
    });

    it('should return sorted phase numbers', () => {
      const phases = [
        { number: 5, isComplete: false },
        { number: 1, isComplete: false },
        { number: 3, isComplete: false },
      ];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([1, 3, 5]);
    });

    it('should handle parallel execution scenarios', () => {
      const phases = [
        { number: 1, isComplete: true },
        {
          number: 2,
          isComplete: false,
          dependency: {
            shortName: 'Frontend',
            dependsOn: [1],
            blocks: [],
            canRunParallelWith: [3],
            parallelTasks: [],
            description: '',
          },
        },
        {
          number: 3,
          isComplete: false,
          dependency: {
            shortName: 'Backend',
            dependsOn: [1],
            blocks: [],
            canRunParallelWith: [2],
            parallelTasks: [],
            description: '',
          },
        },
      ];

      const result = calculateAvailablePhases(phases);

      // Both phase 2 and 3 can run (dependencies satisfied)
      expect(result).toEqual([2, 3]);
    });

    it('should handle complex dependency chains', () => {
      const phases = [
        { number: 1, isComplete: true },
        { number: 2, isComplete: true },
        {
          number: 3,
          isComplete: false,
          dependency: {
            shortName: 'Three',
            dependsOn: [1],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: [],
            description: '',
          },
        },
        {
          number: 4,
          isComplete: false,
          dependency: {
            shortName: 'Four',
            dependsOn: [2],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: [],
            description: '',
          },
        },
        {
          number: 5,
          isComplete: false,
          dependency: {
            shortName: 'Five',
            dependsOn: [3, 4],
            blocks: [],
            canRunParallelWith: [],
            parallelTasks: [],
            description: '',
          },
        },
      ];

      const result = calculateAvailablePhases(phases);

      // Phases 3 and 4 can run (their deps are met), but not 5
      expect(result).toEqual([3, 4]);
    });

    it('should handle all phases completed', () => {
      const phases = [
        { number: 1, isComplete: true },
        { number: 2, isComplete: true },
        { number: 3, isComplete: true },
      ];

      const result = calculateAvailablePhases(phases);

      expect(result).toEqual([]);
    });
  });
});
