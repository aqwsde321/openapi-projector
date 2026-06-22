import { generateCommand } from '#src/commands/generate.mjs';
import { projectCommand } from '#src/commands/project.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { readJsonFile, readTextFile } from '#test-support/files/io.mjs';
import {
  generatedProjectPath,
  projectManifestPath,
  projectSummaryPath,
} from '#test-support/project/paths.mjs';

async function runGenerateAndProject(workspace) {
  await runInWorkspace(workspace, () => generateCommand.run());
  await runInWorkspace(workspace, () => projectCommand.run());
}

async function readGeneratedProjectSource(workspace, generatedPath) {
  return readTextFile(generatedProjectPath(workspace, generatedPath));
}

async function readGeneratedProjectSources(workspace, generatedPaths) {
  return Promise.all(
    generatedPaths.map((generatedPath) =>
      readGeneratedProjectSource(workspace, generatedPath),
    ),
  );
}

async function readProjectManifest(workspace) {
  return readJsonFile(projectManifestPath(workspace));
}

async function readProjectSummary(workspace) {
  return readTextFile(projectSummaryPath(workspace));
}

export {
  generatedProjectPath,
  projectManifestPath,
  readGeneratedProjectSource,
  readGeneratedProjectSources,
  readProjectManifest,
  readProjectSummary,
  runGenerateAndProject,
};
