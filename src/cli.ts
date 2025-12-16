#!/usr/bin/env node
/**
 * CLI entry point for specify-task-parser
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { parseTasksFile } from './parser.js';
import { getSpecFolderFromBranch } from './git-utils.js';
import { formatOutput, formatJSON } from './formatter.js';
import type { CLIOptions } from './types.js';

const TASKS_FILENAME = 'tasks.md';

const HELP_TEXT = `
speckit-status - Track progress on Spec Kit tasks

USAGE:
  speckit-status [OPTIONS]

OPTIONS:
  -s, --spec-folder <path>   Override spec folder (instead of git branch detection)
  -j, --json                 Output as JSON
  -a, --all                  Show all tasks (including completed)
  -p, --phase <number>       Show only specific phase
  -n, --next                 Output only next phase number (for scripts)
  -h, --help                 Show this help message
  -v, --version              Show version

EXAMPLES:
  speckit-status                      # Auto-detect from git branch
  speckit-status -s ./specs/my-spec   # Specify folder manually
  speckit-status -p 2                 # Show phase 2 details
  speckit-status -j                   # Output as JSON
  speckit-status -n                   # Get next phase number
`;

interface ParsedArgs {
  specFolder: string | undefined;
  json: boolean;
  all: boolean;
  phase: number | undefined;
  next: boolean;
  help: boolean;
  version: boolean;
}

function parseCliArgs(): ParsedArgs {
  const { values } = parseArgs({
    options: {
      'spec-folder': {
        type: 'string',
        short: 's',
      },
      json: {
        type: 'boolean',
        short: 'j',
        default: false,
      },
      all: {
        type: 'boolean',
        short: 'a',
        default: false,
      },
      phase: {
        type: 'string',
        short: 'p',
      },
      next: {
        type: 'boolean',
        short: 'n',
        default: false,
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
      version: {
        type: 'boolean',
        short: 'v',
        default: false,
      },
    },
    strict: true,
  });

  return {
    specFolder: values['spec-folder'],
    json: values.json,
    all: values.all,
    phase: values.phase !== undefined ? parseInt(values.phase, 10) : undefined,
    next: values.next,
    help: values.help,
    version: values.version,
  };
}

function getVersion(): string {
  try {
    // Try to read version from package.json
    const packagePath = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8')) as { version: string };
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

function exitWithError(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function main(): void {
  const args = parseCliArgs();

  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (args.version) {
    console.log(getVersion());
    process.exit(0);
  }

  // Determine spec folder
  let specFolder: string;

  if (args.specFolder) {
    specFolder = args.specFolder;
  } else {
    const detectedFolder = getSpecFolderFromBranch();
    if (!detectedFolder) {
      exitWithError(
        'Could not detect spec folder from git branch. Use -s/--spec-folder to specify manually.'
      );
    }
    specFolder = detectedFolder;
  }

  // Check if spec folder exists
  if (!existsSync(specFolder)) {
    exitWithError(`Spec folder does not exist: ${specFolder}`);
  }

  // Read tasks.md file
  const tasksPath = join(specFolder, TASKS_FILENAME);
  if (!existsSync(tasksPath)) {
    exitWithError(`Tasks file not found: ${tasksPath}`);
  }

  const content = readFileSync(tasksPath, 'utf-8');

  // Parse tasks
  const result = parseTasksFile(content, specFolder);

  // Handle --next flag (output only next phase number)
  if (args.next) {
    if (result.nextPhase) {
      console.log(result.nextPhase.number);
    } else {
      console.log('done');
    }
    process.exit(0);
  }

  // Build CLI options for formatter
  const options: CLIOptions = {
    json: args.json,
    showAll: args.all,
    ...(args.specFolder !== undefined && { specFolder: args.specFolder }),
    ...(args.phase !== undefined && { phase: args.phase }),
  };

  // Output
  if (args.json) {
    formatJSON(result);
  } else {
    formatOutput(result, options);
  }
}

main();
