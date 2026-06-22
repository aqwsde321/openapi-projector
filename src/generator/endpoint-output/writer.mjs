import { renderOperationHookSection } from '../operation-hook/renderer.mjs';
import { buildEndpointApplicationReview } from '../review.mjs';
import { writeRenderedEndpointFiles } from './files.mjs';

async function writeEndpointOutput({
  rootDir,
  spec,
  outputDir,
  endpoint,
  endpointFile,
  hookRules,
  summaryPrefix,
}) {
  const hookFile = renderOperationHookSection({
    spec,
    operation: endpoint.operation,
    functionName: endpoint.functionName,
    endpointFileBase: endpointFile.endpointFileBase,
    hookRules,
  });
  const writtenEndpoint = await writeRenderedEndpointFiles({
    rootDir,
    outputDir,
    endpointFile,
    hookFile,
    summaryPrefix,
  });

  return {
    endpointReview: buildEndpointApplicationReview({
      spec,
      endpoint,
      dtoPath: writtenEndpoint.dtoRelativePath,
      apiPath: writtenEndpoint.apiRelativePath,
      hookPath: writtenEndpoint.hookRelativePath,
    }),
    manifestFiles: writtenEndpoint.manifestFiles,
  };
}

export { writeEndpointOutput };
