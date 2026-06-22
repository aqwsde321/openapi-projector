import { isPlainObject } from '../../core/object-utils.mjs';
import {
  addIssue,
  validateOptionalBoolean,
  validateOptionalEnum,
  validateOptionalIdentifier,
  validateOptionalString,
} from './common.mjs';
import { validateOptionalMethodList } from './http-method-list.mjs';

const SUPPORTED_HOOK_LIBRARIES = new Set(['@tanstack/react-query']);
const SUPPORTED_HOOK_QUERY_KEY_STRATEGIES = new Set(['path-and-params', 'path-and-fields']);
const SUPPORTED_HOOK_RESPONSE_UNWRAPS = new Set(['none', 'data']);
function validateStaleTimeRules(issues, hooks) {
  validateOptionalString(issues, 'hooks.staleTimeImportPath', hooks.staleTimeImportPath);
  validateOptionalIdentifier(issues, 'hooks.staleTimeSymbol', hooks.staleTimeSymbol);

  if (hooks.staleTimeImportPath != null && hooks.staleTimeSymbol == null) {
    addIssue(issues, 'hooks.staleTimeSymbol', 'is required with hooks.staleTimeImportPath');
  }

  if (hooks.staleTimeSymbol != null && hooks.staleTimeImportPath == null) {
    addIssue(issues, 'hooks.staleTimeImportPath', 'is required with hooks.staleTimeSymbol');
  }
}

function validateHookRules(issues, hooks) {
  if (!isPlainObject(hooks)) {
    addIssue(issues, 'hooks', 'must be an object');
    return;
  }

  validateOptionalBoolean(issues, 'hooks.enabled', hooks.enabled);
  validateOptionalEnum(
    issues,
    'hooks.library',
    hooks.library,
    SUPPORTED_HOOK_LIBRARIES,
  );
  const queryMethods = validateOptionalMethodList(
    issues,
    'hooks.queryMethods',
    hooks.queryMethods,
  );
  const mutationMethods = validateOptionalMethodList(
    issues,
    'hooks.mutationMethods',
    hooks.mutationMethods,
  );
  const queryMethodSet = new Set(queryMethods);

  for (const method of mutationMethods) {
    if (queryMethodSet.has(method)) {
      addIssue(
        issues,
        'hooks.mutationMethods',
        `must not overlap hooks.queryMethods; duplicate method ${method}`,
      );
    }
  }

  validateOptionalEnum(
    issues,
    'hooks.queryKeyStrategy',
    hooks.queryKeyStrategy,
    SUPPORTED_HOOK_QUERY_KEY_STRATEGIES,
  );
  validateOptionalEnum(
    issues,
    'hooks.responseUnwrap',
    hooks.responseUnwrap,
    SUPPORTED_HOOK_RESPONSE_UNWRAPS,
  );
  validateStaleTimeRules(issues, hooks);
}

export { validateHookRules };
