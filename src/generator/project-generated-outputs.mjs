import { writeProjectedEndpointGroups } from './endpoint-output/groups.mjs';
import { writeProjectSchemaOutput } from './project-schema-output.mjs';

async function writeProjectGeneratedOutputs({
  rootDir,
  spec,
  schemaContents,
  projectGeneratedSrcDir,
  projection,
  renderOptions,
  hookRules,
  layoutRules,
}) {
  const schemaFile = await writeProjectSchemaOutput({
    rootDir,
    schemaContents,
    projectGeneratedSrcDir,
    layoutRules,
  });
  const writtenEndpointGroups = await writeProjectedEndpointGroups({
    rootDir,
    spec,
    projectGeneratedSrcDir,
    projection,
    renderOptions,
    hookRules,
  });

  return {
    endpointReviews: writtenEndpointGroups.endpointReviews,
    manifestFiles: [
      schemaFile,
      ...writtenEndpointGroups.manifestFiles,
    ],
  };
}

export { writeProjectGeneratedOutputs };
