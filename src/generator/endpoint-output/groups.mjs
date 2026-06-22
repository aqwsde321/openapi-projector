import { renderEndpointFile } from '../project-endpoint-file-renderer.mjs';
import { buildEndpointOutputGroups } from './plan.mjs';
import { writeEndpointOutput } from './writer.mjs';

async function writeProjectedEndpointGroups({
  rootDir,
  spec,
  projectGeneratedSrcDir,
  projection,
  renderOptions,
  hookRules,
}) {
  const manifestFiles = [];
  const endpointReviews = [];

  const outputGroups = buildEndpointOutputGroups({
    projectGeneratedSrcDir,
    projection,
  });

  for (const outputGroup of outputGroups) {
    const writtenGroup = await writeEndpointOutputGroup({
      rootDir,
      spec,
      renderOptions,
      hookRules,
      ...outputGroup,
    });

    manifestFiles.push(...writtenGroup.manifestFiles);
    endpointReviews.push(...writtenGroup.endpointReviews);
  }

  return {
    endpointReviews,
    manifestFiles,
  };
}

async function writeEndpointOutputGroup({
  rootDir,
  spec,
  outputDir,
  endpoints,
  renderOptions,
  hookRules,
  summaryPrefix = null,
}) {
  const manifestFiles = [];
  const endpointReviews = [];

  for (const endpoint of endpoints) {
    const endpointFile = renderEndpointFile({
      ...renderOptions,
      endpoint,
    });
    const writtenEndpoint = await writeEndpointOutput({
      rootDir,
      spec,
      outputDir,
      endpoint,
      endpointFile,
      hookRules,
      summaryPrefix,
    });
    manifestFiles.push(...writtenEndpoint.manifestFiles);
    endpointReviews.push(writtenEndpoint.endpointReview);
  }

  return {
    endpointReviews,
    manifestFiles,
  };
}

export {
  writeProjectedEndpointGroups,
};
