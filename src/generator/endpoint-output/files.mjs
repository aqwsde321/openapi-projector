import { writeText } from '../../io/files.mjs';
import {
  buildEndpointManifestFiles,
  buildEndpointSummary,
  hasHookOutput,
  resolveEndpointOutputFiles,
} from './manifest.mjs';

async function writeRenderedEndpointFiles({
  rootDir,
  outputDir,
  endpointFile,
  hookFile,
  summaryPrefix,
}) {
  const endpointSummary = buildEndpointSummary(
    summaryPrefix,
    endpointFile.endpointFileBase,
  );
  const outputFiles = resolveEndpointOutputFiles({
    rootDir,
    outputDir,
    endpointFileBase: endpointFile.endpointFileBase,
    hookFile,
  });
  const manifestFiles = buildEndpointManifestFiles({
    endpointSummary,
    outputFiles,
    hookFile,
  });

  await writeText(outputFiles.dtoFilePath, endpointFile.dtoSource);
  await writeText(outputFiles.apiFilePath, endpointFile.apiSource);

  if (hasHookOutput({ hookFile, outputFiles })) {
    await writeText(outputFiles.hookFilePath, hookFile.hookSource);
  }

  return {
    apiRelativePath: outputFiles.apiRelativePath,
    dtoRelativePath: outputFiles.dtoRelativePath,
    hookRelativePath: outputFiles.hookRelativePath,
    manifestFiles,
  };
}

export { writeRenderedEndpointFiles };
