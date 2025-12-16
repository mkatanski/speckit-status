# speckit-status

[![npm version](https://img.shields.io/npm/v/@mkatanski/speckit-status.svg)](https://www.npmjs.com/package/@mkatanski/speckit-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

A CLI companion for [GitHub's Spec Kit](https://github.com/github/spec-kit) that visualizes and tracks progress on spec-driven development tasks.

---

## What is this?

When working with AI coding agents using the Spec-Driven Development workflow, [Spec Kit](https://github.com/github/spec-kit) generates `tasks.md` files containing phased implementation plans. This CLI tool parses those files to give you:

- **Progress tracking** with visual progress bars
- **Phase status** at a glance with completion counts
- **Dependency awareness** showing which phases are blocked or available
- **Smart suggestions** for what to work on next
- **JSON export** for CI/CD pipelines and automation

## Features

- Parses Spec Kit's `tasks.md` format (phases, task IDs, checkboxes)
- Understands `[P]` parallel markers and phase dependencies
- Auto-detects spec folder from git branch name
- Beautiful colored terminal output
- Machine-readable JSON output
- Zero runtime dependencies
- Works as both CLI and Node.js library

## Installation

```bash
# npm
npm install -g @mkatanski/speckit-status

# pnpm
pnpm add -g @mkatanski/speckit-status

# Or run directly without installing
npx @mkatanski/speckit-status --help
pnpm dlx @mkatanski/speckit-status --help
```

## Quick Start

```bash
# In a project with specs/ directory and matching git branch
speckit-status

# Or specify the spec folder directly
speckit-status -s ./specs/001-my-feature
```

## Usage

```
speckit-status [OPTIONS]

OPTIONS:
  -s, --spec-folder <path>   Override spec folder (instead of git branch detection)
  -j, --json                 Output as JSON
  -a, --all                  Show all tasks (including completed)
  -p, --phase <number>       Show only specific phase
  -n, --next                 Output only next phase number (for scripts)
  -h, --help                 Show help message
  -v, --version              Show version
```

### Examples

```bash
# Auto-detect spec from git branch name
speckit-status

# Show specific phase details
speckit-status -p 2

# Export progress as JSON
speckit-status -j > progress.json

# Get next phase number for scripting
NEXT=$(speckit-status -n)
echo "Next phase: $NEXT"

# Show all tasks including completed ones
speckit-status -a -p 1
```

## Integration with Spec Kit

This tool is designed to work with [GitHub's Spec Kit](https://github.com/github/spec-kit) workflow:

```
/speckit.specify  →  spec.md
/speckit.plan     →  plan.md
/speckit.tasks    →  tasks.md  ←  parsed by this CLI
/speckit.implement
```

### Directory Structure

Spec Kit creates specs in a structured directory:

```
specs/
└── 001-my-feature/
    ├── spec.md
    ├── plan.md
    ├── tasks.md      # This is what gets parsed
    └── ...
```

### Git Branch Detection

The CLI auto-detects the spec folder from your git branch name:

- Branch `001-my-feature` → looks for `specs/001-my-feature/`
- Branch `feature/001-my-feature` → extracts `001-my-feature`

## Programmatic Usage

Use as a library in your Node.js projects:

```typescript
import {
  parseTasksFile,
  formatOutput,
  formatJSON,
  getCurrentBranch,
  getSpecFolderFromBranch,
} from '@mkatanski/speckit-status';
import { readFileSync } from 'fs';

// Parse a tasks.md file
const content = readFileSync('./specs/001-feature/tasks.md', 'utf-8');
const result = parseTasksFile(content, './specs/001-feature');

console.log(`Progress: ${result.completedTasks}/${result.totalTasks}`);
console.log(`Next phase: ${result.nextPhase?.number}`);
console.log(`Available phases: ${result.availablePhases.map(p => p.number).join(', ')}`);

// Access phase details
for (const phase of result.phases) {
  console.log(`Phase ${phase.number}: ${phase.title}`);
  console.log(`  Tasks: ${phase.completedCount}/${phase.totalCount}`);
  console.log(`  Complete: ${phase.isComplete}`);

  if (phase.dependency) {
    console.log(`  Depends on: ${phase.dependency.dependsOn.join(', ')}`);
    console.log(`  Blocks: ${phase.dependency.blocks.join(', ')}`);
  }
}
```

### Types

```typescript
interface Task {
  id: string;           // T001, T002, etc.
  completed: boolean;
  title: string;
}

interface Phase {
  number: number;
  title: string;
  priority?: string;    // P1, P2, etc.
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  dependency?: PhaseDependency;
}

interface PhaseDependency {
  shortName: string;
  dependsOn: number[];
  blocks: number[];
  canRunParallelWith: number[];
  parallelTasks: string[];
  description: string;
}

interface ParseResult {
  specFolder: string;
  specName: string;
  phases: Phase[];
  totalTasks: number;
  completedTasks: number;
  nextPhase?: Phase;
  availablePhases: Phase[];
}
```

## AI-Assisted Development

This project embraces the future. I welcome pull requests whether you wrote every line by hand, pair-programmed with an AI, or let Claude/GPT/Copilot do the heavy lifting while you sipped coffee.

**The deal is simple:**

- You hit the submit button, you own the code
- Review what you're submitting like it's going to production (because it is)
- Tests pass? Types check? Linting clean? Ship it
- If it breaks, it's on you - not your AI buddy

I don't gatekeep how code gets written. I care that it works, it's readable, and it doesn't break things. The future of development is hybrid - let's build it together.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Test locally
./dist/cli.js --help
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

Built for the [Spec-Driven Development](https://github.com/github/spec-kit) workflow.
