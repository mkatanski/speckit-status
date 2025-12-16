/**
 * Commitlint configuration
 * Enforces conventional commits with minimal type set
 *
 * Allowed formats:
 * - type: description
 * - type(scope): description
 * - type!: breaking change
 * - type(scope)!: breaking change
 *
 * Allowed types: feat, fix, docs, chore
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Only allow: feat, fix, docs, chore
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'chore']],
    // Type is required
    'type-empty': [2, 'never'],
    // Subject is required
    'subject-empty': [2, 'never'],
    // No max length for header (default is 100, can be restrictive)
    'header-max-length': [0, 'always', Infinity],
  },
};
