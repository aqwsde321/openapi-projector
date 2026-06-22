import path from 'node:path';

function buildEndpointOutputGroups({ projectGeneratedSrcDir, projection }) {
  if (projection.wrapperGrouping === 'flat') {
    return [
      {
        outputDir: projectGeneratedSrcDir,
        endpoints: projection.flatEndpoints,
      },
    ];
  }

  return projection.tagDirectories.map((tagDirectory) => {
    const tagFileName = tagDirectory.tagDirectoryName;

    return {
      outputDir: path.join(projectGeneratedSrcDir, tagFileName),
      endpoints: tagDirectory.endpoints,
      summaryPrefix: `tag=${tagFileName}`,
    };
  });
}

export { buildEndpointOutputGroups };
