import { formatSuccess } from '../../cli/format.mjs';
import { renderProjectSummary } from '../../generator/review.mjs';
import { readText, writeJson } from '../../io/files.mjs';

async function readGeneratedSchemaContents(generatedSchemaPath) {
  try {
    return await readText(generatedSchemaPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(
        `Generated schema not found: ${generatedSchemaPath}\nRun npx --yes openapi-projector@latest generate first.`,
      );
    }
    throw error;
  }
}

async function writeProjectCommandResult({
  manifest,
  projectGeneratedSrcDir,
  projectManifestPath,
  projectSummaryPath,
}) {
  await writeJson(projectManifestPath, manifest);

  console.log(formatSuccess(`Generated project candidate files into ${projectGeneratedSrcDir}`));
  console.log(`- manifest: ${projectManifestPath}`);
  console.log(`- summary: ${projectSummaryPath}`);
  console.log(renderProjectSummary(manifest));
}

export {
  readGeneratedSchemaContents,
  writeProjectCommandResult,
};
