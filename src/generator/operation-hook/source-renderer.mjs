import { renderQueryKeyExpression } from './query-key.mjs';
import {
  renderRequestArgument,
  renderRequestParams,
  renderResponseReturn,
} from './request-call-renderer.mjs';

function renderQueryHook({
  functionName,
  hookName,
  requestTypeName,
  operation,
  requestContext,
  hookRules,
}) {
  const queryKeyExpression = renderQueryKeyExpression({
    operation,
    requestContext,
    queryKeyStrategy: hookRules.queryKeyStrategy,
  });
  const requestParams = renderRequestParams(requestContext, requestTypeName);
  const requestArgument = renderRequestArgument(requestContext);
  const lines = [
    `const ${hookName} = (${requestParams}) => {`,
    '  return useQuery({',
    `    queryKey: ${queryKeyExpression},`,
    '    queryFn: async () => {',
    `      const response = await ${functionName}(${requestArgument});`,
    `      ${renderResponseReturn('response', hookRules.responseUnwrap)}`,
    '    },',
  ];

  if (hookRules.staleTimeSymbol) {
    lines.push(`    staleTime: ${hookRules.staleTimeSymbol},`);
  }

  lines.push('  });', '};');
  return lines.join('\n');
}

function renderMutationHook({
  functionName,
  hookName,
  requestTypeName,
  requestContext,
  hookRules,
}) {
  const requestParams = renderRequestParams(requestContext, requestTypeName);
  const requestArgument = renderRequestArgument(requestContext);
  const lines = [
    `const ${hookName} = () => {`,
    '  return useMutation({',
  ];

  if (hookRules.responseUnwrap === 'data') {
    lines.push(
      `    mutationFn: async (${requestParams}) => {`,
      `      const response = await ${functionName}(${requestArgument});`,
      '      return response.data;',
      '    },',
    );
  } else {
    lines.push(
      `    mutationFn: (${requestParams}) => ${functionName}(${requestArgument}),`,
    );
  }

  lines.push('  });', '};');
  return lines.join('\n');
}

export {
  renderMutationHook,
  renderQueryHook,
};
