import { toPascalIdentifier } from '../../projector/naming.mjs';
import { buildHookSourceImports } from './imports.mjs';
import { getHookRequestContext } from './request-context.mjs';
import { normalizeHookRules } from './rules.mjs';
import {
  renderMutationHook,
  renderQueryHook,
} from './source-renderer.mjs';

function renderOperationHookSection({
  spec,
  operation,
  functionName,
  endpointFileBase,
  hookRules: rawHookRules = {},
}) {
  const hookRules = normalizeHookRules(rawHookRules);

  if (!hookRules.enabled) {
    return null;
  }

  const method = String(operation.method).toUpperCase();
  const isQuery = hookRules.queryMethods.includes(method);
  const isMutation = !isQuery && hookRules.mutationMethods.includes(method);

  if (!isQuery && !isMutation) {
    return null;
  }

  const dtoBaseName = toPascalIdentifier(functionName);
  const requestTypeName = `${dtoBaseName}RequestDto`;
  const hookSuffix = isQuery ? 'Query' : 'Mutation';
  const hookName = `use${dtoBaseName}${hookSuffix}`;
  const requestContext = getHookRequestContext(spec, operation);
  const imports = buildHookSourceImports({
    endpointFileBase,
    functionName,
    hookRules,
    isQuery,
    requestContext,
    requestTypeName,
  });

  const hookSource = isQuery
    ? renderQueryHook({
        functionName,
        hookName,
        requestTypeName,
        operation,
        requestContext,
        hookRules,
      })
    : renderMutationHook({
        functionName,
        hookName,
        requestTypeName,
        requestContext,
        hookRules,
      });

  return {
    hookKind: isQuery ? 'query' : 'mutation',
    hookFileBase: `${endpointFileBase}.${isQuery ? 'query' : 'mutation'}`,
    hookName,
    hookSource: [...imports, '', hookSource, '', `export { ${hookName} };`, ''].join('\n'),
  };
}

export { renderOperationHookSection };
