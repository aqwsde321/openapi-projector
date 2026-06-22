import path from 'node:path';

import { toProjectRelativePath } from '../../core/path-utils.mjs';

function buildEndpointSummary(summaryPrefix, endpointFileBase) {
  return summaryPrefix
    ? `${summaryPrefix} endpoint=${endpointFileBase}`
    : `endpoint=${endpointFileBase}`;
}

function resolveEndpointOutputFiles({
  rootDir,
  outputDir,
  endpointFileBase,
  hookFile,
}) {
  const dtoFilePath = path.join(outputDir, `${endpointFileBase}.dto.ts`);
  const apiFilePath = path.join(outputDir, `${endpointFileBase}.api.ts`);
  const hookFilePath = hookFile
    ? path.join(outputDir, `${hookFile.hookFileBase}.ts`)
    : null;

  return {
    apiFilePath,
    apiRelativePath: toProjectRelativePath(rootDir, apiFilePath),
    dtoFilePath,
    dtoRelativePath: toProjectRelativePath(rootDir, dtoFilePath),
    hookFilePath,
    hookRelativePath: hookFilePath
      ? toProjectRelativePath(rootDir, hookFilePath)
      : null,
  };
}

function hasHookOutput({ hookFile, outputFiles }) {
  return Boolean(
    hookFile
      && outputFiles.hookFilePath
      && outputFiles.hookRelativePath,
  );
}

function buildEndpointManifestFiles({
  endpointSummary,
  outputFiles,
  hookFile,
}) {
  const manifestFiles = [
    {
      kind: 'dto',
      generated: outputFiles.dtoRelativePath,
      summary: endpointSummary,
    },
    {
      kind: 'api',
      generated: outputFiles.apiRelativePath,
      summary: endpointSummary,
    },
  ];

  if (hasHookOutput({ hookFile, outputFiles })) {
    manifestFiles.push({
      kind: `${hookFile.hookKind}-hook`,
      generated: outputFiles.hookRelativePath,
      summary: `${endpointSummary} hook=${hookFile.hookName}`,
    });
  }

  return manifestFiles;
}

export {
  buildEndpointManifestFiles,
  buildEndpointSummary,
  hasHookOutput,
  resolveEndpointOutputFiles,
};
