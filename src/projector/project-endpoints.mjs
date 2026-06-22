import {
  toKebabCase,
} from '../core/text-utils.mjs';
import {
  buildOperationSymbolBase,
  createUniqueName,
} from './naming.mjs';
import { classifyProjectOperations } from './project-operation-classifier.mjs';
import {
  buildTagDirectories,
  buildTagDirectoryName,
} from './project-tag-directories.mjs';

function buildProjectedEndpoint(operation, usedNames, tagDirectoryName = null) {
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
}

function buildFlatEndpoints(operations) {
  const usedNames = new Set();
  return operations.map((operation) => buildProjectedEndpoint(operation, usedNames));
}

function projectOperations(operations, apiRules = {}) {
  const { supportedOperations, skippedOperations } = classifyProjectOperations(operations);
  const wrapperGrouping = apiRules.wrapperGrouping ?? 'tag';
  const tagFileCase = apiRules.tagFileCase ?? 'title';

  if (wrapperGrouping === 'flat') {
    return {
      totalEndpoints: operations.length,
      generatedEndpoints: supportedOperations.length,
      skippedOperations,
      tagDirectories: [],
      flatEndpoints: buildFlatEndpoints(supportedOperations),
      wrapperGrouping,
    };
  }

  return {
    totalEndpoints: operations.length,
    generatedEndpoints: supportedOperations.length,
    skippedOperations,
    flatEndpoints: [],
    tagDirectories: buildTagDirectories(
      supportedOperations,
      tagFileCase,
      buildProjectedEndpoint,
    ),
    wrapperGrouping,
  };
}

export {
  buildTagDirectoryName,
  classifyProjectOperations,
  projectOperations,
};
