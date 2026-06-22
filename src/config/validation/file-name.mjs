import { addIssue } from './issues.mjs';

function validateOptionalFileName(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
    return;
  }

  if (
    value.includes('/') ||
    value.includes('\\') ||
    value === '.' ||
    value === '..' ||
    value.includes('..')
  ) {
    addIssue(issues, path, 'must be a file name, not a path');
    return;
  }

  if (!value.endsWith('.ts')) {
    addIssue(issues, path, 'must end with .ts');
  }
}

export { validateOptionalFileName };
