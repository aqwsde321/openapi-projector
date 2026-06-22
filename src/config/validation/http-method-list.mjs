import { addIssue } from './common.mjs';

const SUPPORTED_HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
  'TRACE',
]);

function validateOptionalMethodList(issues, path, value) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(issues, path, 'must be an array of HTTP methods');
    return [];
  }

  const methods = [];

  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || !item.trim()) {
      addIssue(issues, `${path}[${index}]`, 'must be a non-empty string');
      continue;
    }

    const method = item.toUpperCase();
    methods.push(method);

    if (!SUPPORTED_HTTP_METHODS.has(method)) {
      addIssue(
        issues,
        `${path}[${index}]`,
        `unsupported HTTP method ${JSON.stringify(item)}`,
      );
    }
  }

  return methods;
}

export { validateOptionalMethodList };
