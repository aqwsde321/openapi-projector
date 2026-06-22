import { resolveEndpointDocPath } from '../../config/project-paths.mjs';
import { cleanDir, writeText } from '../../io/files.mjs';
import { renderEndpointDoc } from './docs.mjs';

async function writeGenerateOutputs({
  docsDir,
  endpoints,
  generatedSchemaPath,
  legacyEndpointsDir,
  reviewGeneratedDir,
  schemaSource,
  spec,
}) {
  await cleanDir(docsDir);
  await cleanDir(reviewGeneratedDir);
  if (legacyEndpointsDir) {
    await cleanDir(legacyEndpointsDir);
  }

  for (const entry of endpoints) {
    const filePath = resolveEndpointDocPath(docsDir, entry.id);
    await writeText(filePath, renderEndpointDoc({ entry, spec }));
  }

  await writeText(
    generatedSchemaPath,
    schemaSource.endsWith('\n') ? schemaSource : `${schemaSource}\n`,
  );
}

export { writeGenerateOutputs };
