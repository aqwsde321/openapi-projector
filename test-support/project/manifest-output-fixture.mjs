import path from 'node:path';

import { readJson } from '#src/io/files.mjs';
import { assertAllExist, assertAllMissing } from '#test-support/files/assertions.mjs';
import { readTextFiles } from '#test-support/files/io.mjs';
import {
  generatedProjectPath,
  projectGeneratedRootPath,
  projectManifestPath,
  projectSummaryPath,
} from '#test-support/project/paths.mjs';

async function readProjectManifestHandoffOutput(workspace) {
  const generatedRoot = projectGeneratedRootPath(workspace);
  const defaultDtoPath = generatedProjectPath(workspace, 'default/get-health-status.dto.ts');
  const profilesDtoPath = generatedProjectPath(workspace, 'Profiles/update-profile.dto.ts');
  const defaultApiPath = generatedProjectPath(workspace, 'default/get-health-status.api.ts');
  const profilesApiPath = generatedProjectPath(workspace, 'Profiles/update-profile.api.ts');
  const manifestPath = projectManifestPath(workspace);
  const summaryPath = projectSummaryPath(workspace);

  await assertAllExist([
    path.join(generatedRoot, 'schema.ts'),
    defaultDtoPath,
    profilesDtoPath,
    defaultApiPath,
    profilesApiPath,
    manifestPath,
  ]);
  await assertAllMissing([
    path.join(generatedRoot, 'default/index.ts'),
    path.join(generatedRoot, 'Profiles/index.ts'),
    path.join(generatedRoot, 'index.ts'),
  ]);

  const [
    defaultApiSource,
    defaultDtoSource,
    profilesApiSource,
    profilesDtoSource,
    summarySource,
  ] = await readTextFiles([
    defaultApiPath,
    defaultDtoPath,
    profilesApiPath,
    profilesDtoPath,
    summaryPath,
  ]);

  return {
    defaultApiSource,
    defaultDtoSource,
    manifest: await readJson(manifestPath),
    profilesApiSource,
    profilesDtoSource,
    summarySource,
  };
}

export { readProjectManifestHandoffOutput };
