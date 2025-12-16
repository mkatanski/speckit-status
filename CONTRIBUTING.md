# Contributing to speckit-status

Thank you for your interest in contributing to speckit-status! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Convention](#commit-convention)
- [Pull Request Guidelines](#pull-request-guidelines)
- [License](#license)

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm 10.8.2 or higher

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/speckit-status.git
   cd speckit-status
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/mkatanski/speckit-status.git
   ```

### Installation

Install dependencies:

```bash
npm install
```

## Development Workflow

### Build the project

```bash
npm run build
```

### Development mode with watch

```bash
npm run dev
```

This will rebuild the project automatically when you make changes.

### Type checking

```bash
npm run typecheck
```

### Clean build artifacts

```bash
npm run clean
```

### Testing the CLI locally

After building, you can test the CLI:

```bash
node dist/cli.js
```

## Code Style

This project uses **Prettier** and **ESLint** to maintain consistent code style.

### Formatting with Prettier

Format all TypeScript files:

```bash
npm run format
```

Check formatting without making changes:

```bash
npm run format:check
```

### Linting with ESLint

Run ESLint to check for code issues:

```bash
npm run lint
```

**Important**:
- Never disable ESLint rules globally or locally just to fix an issue
- Do not use the `any` type - use proper types, generics, or `unknown` as a last resort
- Follow the existing code patterns in the project

## Testing

This project uses **Vitest** for testing.

### Run tests

```bash
npm test
```

### Watch mode for tests

```bash
npm run test:watch
```

### Coverage report

```bash
npm run test:coverage
```

### Testing Requirements

- All new features should include tests
- Bug fixes should include regression tests
- Ensure all tests pass before submitting a pull request
- Aim for high test coverage on new code

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and automated releases.

### Commit Message Format

All commits must follow this format:

```
type: description
type(scope): description
type!: breaking change description
```

### Allowed Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor (0.X.0) |
| `fix` | Bug fix | Patch (0.0.X) |
| `docs` | Documentation only | No release |
| `chore` | Maintenance tasks | No release |

### Breaking Changes

Add `!` after the type for breaking changes:

```
feat!: remove deprecated API
fix(parser)!: change return type
```

Breaking changes trigger a **major** version bump (X.0.0).

### Examples

```bash
# Feature
git commit -m "feat: add JSON export option"

# Bug fix with scope
git commit -m "fix(parser): handle empty phases correctly"

# Documentation (no release)
git commit -m "docs: update API examples"

# Breaking change
git commit -m "feat!: change CLI argument format"
```

### Local Validation

Commits are validated locally via Husky + commitlint. Invalid commits will be rejected.

### Automated Releases

When PRs are merged to `main`:
- `feat` or `fix` commits trigger an automatic release
- `docs` or `chore` only commits do not trigger a release
- Changelog is automatically generated from commit messages

## Pull Request Guidelines

### Before submitting a PR

1. **Update your branch** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   ```

3. **Ensure all commits follow conventional format** (commitlint validates locally)

### Submitting the PR

1. Push your branch to your fork:
   ```bash
   git push origin your-branch-name
   ```

2. Open a pull request against the `main` branch

3. **PR title must follow conventional commits format**:
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update documentation`
   - `chore: maintenance task`

4. Fill out the pull request template with clear description of changes

### PR Requirements

- PR title must follow conventional commits format
- All commits must follow conventional commits format
- All tests must pass
- Code must pass linting and formatting checks
- Update documentation if needed

### Merge Options

Both **squash merge** and **rebase merge** are allowed:
- **Squash**: PR title becomes the commit message (single changelog entry)
- **Rebase**: All commits preserved (multiple changelog entries)

### Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, a maintainer will merge your PR

## Additional Guidelines

### Commit Messages

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format. See the [Commit Convention](#commit-convention) section for details.

### Documentation

- Update the README if you add new features
- Add JSDoc comments to public APIs
- Keep documentation up to date with code changes

### Questions or Issues?

- Check existing issues before creating a new one
- Use issue templates when reporting bugs or requesting features
- Be respectful and constructive in all interactions

## License

By contributing to speckit-status, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing!
