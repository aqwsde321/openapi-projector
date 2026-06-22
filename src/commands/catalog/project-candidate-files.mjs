import path from 'node:path';

import { buildOperationKey } from '../../catalog/endpoint-catalog.mjs';
import { toProjectRelativePath } from '../../core/path-utils.mjs';
import { loadProjectRules } from '../../core/project-workspace.mjs';
import { collectProjectOperations } from '../../openapi/collect-operations.mjs';
import { projectOperations } from '../../projector/project-endpoints.mjs';

async function buildProjectCandidateFilesByOperation({
  rootDir,
  spec,
  projectConfig,
}) {
  const apiRules = await loadBestEffortProjectApiRules(rootDir, projectConfig);
  const operations = collectProjectOperations(spec);
  const projection = projectOperations(operations, apiRules);
  const projectGeneratedSrcDir = path.resolve(
    rootDir,
    projectConfig.projectGeneratedSrcDir ?? 'openapi/project/src/openapi-generated',
  );
  const filesByOperation = new Map();

  for (const endpoint of projection.flatEndpoints) {
    addProjectCandidateFiles(filesByOperation, {
      rootDir,
      endpoint,
      directoryPath: projectGeneratedSrcDir,
    });
  }

  for (const tagDirectory of projection.tagDirectories) {
    const directoryPath = path.join(projectGeneratedSrcDir, tagDirectory.tagDirectoryName);

    for (const endpoint of tagDirectory.endpoints) {
      addProjectCandidateFiles(filesByOperation, {
        rootDir,
        endpoint,
        directoryPath,
      });
    }
  }

  return filesByOperation;
}

async function loadBestEffortProjectApiRules(rootDir, projectConfig) {
  try {
    const { projectRules } = await loadProjectRules(rootDir, projectConfig);
    return projectRules.api ?? {};
  } catch {
    return {};
  }
}

function addProjectCandidateFiles(filesByOperation, {
  rootDir,
  endpoint,
  directoryPath,
}) {
  const dtoPath = path.join(directoryPath, `${endpoint.endpointFileBase}.dto.ts`);
  const apiPath = path.join(directoryPath, `${endpoint.endpointFileBase}.api.ts`);

  filesByOperation.set(buildOperationKey(endpoint.operation.method, endpoint.operation.path), {
    dto: toProjectRelativePath(rootDir, dtoPath),
    api: toProjectRelativePath(rootDir, apiPath),
  });
}

export { buildProjectCandidateFilesByOperation };
