import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readGeneratedProjectSources,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';
import { addMultipartUploadEndpoint } from '#test-support/project/media-fixture.mjs';
import {
  createAxiosFetchApiTypecheckFiles,
  runProjectTypeCheck,
} from '#test-support/project/typescript-files.mjs';

test(
  'project generates multipart request body wrappers',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    addMultipartUploadEndpoint(spec);

    await withWorkspace({ spec, extraFiles: createAxiosFetchApiTypecheckFiles() }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const [uploadApiSource, uploadDtoSource] = await readGeneratedProjectSources(workspace, [
        'Uploads/upload-file.api.ts',
        'Uploads/upload-file.dto.ts',
      ]);

      assertMatchesAll(uploadApiSource, [
        /export const uploadFile = async \(requestDto: UploadFileRequestDto\)/,
        /data: requestDto,/,
        /from '\.\/upload-file\.dto'/,
      ]);
      assertMatchesAll(uploadDtoSource, [
        /export interface UploadFileRequestDto \{/,
        /file\?: File;/,
      ]);

      await runProjectTypeCheck(workspace);
    });
  },
);
