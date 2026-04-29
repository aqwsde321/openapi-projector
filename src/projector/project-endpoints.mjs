import { classifyProjectOperations } from '../openapi/classify-operations.mjs';
import { buildTagDirectoryName } from './layout.mjs';
import {
  buildOperationSymbolBase,
  createUniqueName,
} from './naming.mjs';
import { toKebabCase } from '../core/openapi-utils.mjs';

function projectOperations(operations, apiRules = {}) {
  const { supportedOperations, skippedOperations } = classifyProjectOperations(operations);
  const wrapperGrouping = apiRules.wrapperGrouping ?? 'tag';
  const tagDirectoryMap = new Map();
  const tagFileCase = apiRules.tagFileCase ?? 'title';

  if (wrapperGrouping === 'flat') {
    const usedNames = new Set();
    const endpoints = supportedOperations.map((operation) => {
      const functionName = createUniqueName(
        buildOperationSymbolBase(operation),
        usedNames,
      );

      return {
        tagDirectoryName: null,
        endpointFileBase: toKebabCase(functionName),
        functionName,
        operation,
      };
    });

    return {
      totalEndpoints: operations.length,
      generatedEndpoints: supportedOperations.length,
      skippedOperations,
      tagDirectories: [],
      flatEndpoints: endpoints,
      wrapperGrouping,
    };
  }

  for (const operation of supportedOperations) {
    const tagDirectoryName = buildTagDirectoryName(
      operation.tag || 'default',
      tagFileCase,
    );

    if (!tagDirectoryMap.has(tagDirectoryName)) {
      tagDirectoryMap.set(tagDirectoryName, []);
    }

    tagDirectoryMap.get(tagDirectoryName).push(operation);
  }

  const tagDirectories = Array.from(tagDirectoryMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tagDirectoryName, tagOperations]) => {
      const usedNames = new Set();
      const endpoints = tagOperations.map((operation) => {
        const functionName = createUniqueName(
          buildOperationSymbolBase(operation),
          usedNames,
        );

        return {
          tagDirectoryName,
          endpointFileBase: toKebabCase(functionName),
          functionName,
          operation,
        };
      });

      return {
        tagDirectoryName,
        endpoints,
      };
    });

  return {
    totalEndpoints: operations.length,
    generatedEndpoints: supportedOperations.length,
    skippedOperations,
    flatEndpoints: [],
    tagDirectories,
    wrapperGrouping,
  };
}

export { projectOperations };
