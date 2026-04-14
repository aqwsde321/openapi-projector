import fs from 'node:fs/promises';
import path from 'node:path';

import {
  cleanDir,
  loadProjectConfig,
  loadProjectRules,
  writeJson,
} from '../core/openapi-utils.mjs';
import {
  loadSupportedOpenApiSpec,
  resolveGeneratedSchemaPath,
} from '../openapi/load-spec.mjs';
import { renderProjectSummary, writeProjectOutputs } from '../openapi/project-generator.mjs';

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

function validateProjectRules(projectRules) {
  const wrapperGrouping = projectRules?.api?.wrapperGrouping ?? 'tag';
  const tagFileCase = projectRules?.api?.tagFileCase ?? 'title';
  const adapterStyle = projectRules?.api?.adapterStyle ?? 'url-config';

  if (wrapperGrouping !== 'tag') {
    throw new Error(
      `Unsupported api.wrapperGrouping: ${wrapperGrouping}\nMVP v2 only supports "tag".`,
    );
  }

  if (!['kebab', 'title'].includes(tagFileCase)) {
    throw new Error(
      `Unsupported api.tagFileCase: ${tagFileCase}\nMVP v2 supports "kebab" or "title".`,
    );
  }

  if (!['url-config', 'request-object'].includes(adapterStyle)) {
    throw new Error(
      `Unsupported api.adapterStyle: ${adapterStyle}\nMVP v2 supports "url-config" or "request-object".`,
    );
  }
}

const projectCommand = {
  name: 'project',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);
    const { projectRulesPath, projectRules } = await loadProjectRules(rootDir, projectConfig);

    validateProjectRules(projectRules);

    const sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    const generatedSchemaPath = resolveGeneratedSchemaPath(rootDir, projectConfig);
    const projectGeneratedSrcDir = path.resolve(rootDir, projectConfig.projectGeneratedSrcDir);
    const projectRootDir = path.resolve(projectGeneratedSrcDir, '..', '..');
    const projectManifestPath = path.join(projectRootDir, 'manifest.json');
    const projectSummaryPath = path.join(projectRootDir, 'summary.md');
    const applyTargetSrcDir = toPosixPath(projectConfig.applyTargetSrcDir);

    const spec = await loadSupportedOpenApiSpec(sourcePath);

    let schemaContents;
    try {
      schemaContents = await fs.readFile(generatedSchemaPath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `Generated schema not found: ${generatedSchemaPath}\nRun openapi-tool generate first.`,
        );
      }
      throw error;
    }

    await cleanDir(projectGeneratedSrcDir);

    const manifest = await writeProjectOutputs({
      rootDir,
      spec,
      schemaSourcePath: sourcePath,
      schemaContents,
      projectGeneratedSrcDir,
      projectManifestPath,
      projectSummaryPath,
      projectRulesPath: toPosixPath(path.relative(rootDir, projectRulesPath)),
      applyTargetSrcDir,
      generatedSchemaPath: toPosixPath(path.relative(rootDir, generatedSchemaPath)),
      apiRules: projectRules.api ?? {},
      layoutRules: projectRules.layout ?? {},
    });

    await writeJson(projectManifestPath, manifest);

    console.log(`Generated project candidate files into ${projectGeneratedSrcDir}`);
    console.log(`- manifest: ${projectManifestPath}`);
    console.log(`- summary: ${projectSummaryPath}`);
    console.log(renderProjectSummary(manifest));
  },
};

export { projectCommand };
