import { resolveProjectRulesCommandPaths } from '../../config/project-paths.mjs';
import { loadProjectConfig } from '../../core/project-workspace.mjs';
import {
  writeJson,
  writeText,
} from '../../io/files.mjs';
import { analyzeProject } from '../../project-analyzer/analyze-project.mjs';
import { renderAnalysisMarkdown } from './analysis-markdown.mjs';
import { readPreviousAnalysis } from './previous-analysis.mjs';
import { printProjectRulesResult } from './result-printer.mjs';
import { writeProjectRulesFile } from './scaffold.mjs';

async function runProjectRules(rootDir) {
  const { projectConfig } = await loadProjectConfig(rootDir);
  const {
    analysisPath,
    analysisJsonPath,
    relativeAnalysisJsonPath,
    relativeRulesPath,
    rulesPath,
  } = resolveProjectRulesCommandPaths(rootDir, projectConfig);
  const generatedAt = new Date().toISOString();
  const previousAnalysis = await readPreviousAnalysis(analysisJsonPath);

  const analysis = await analyzeProject(rootDir, { generatedAt });

  await writeJson(analysisJsonPath, analysis);

  await writeText(
    analysisPath,
    renderAnalysisMarkdown({
      analysis,
      analysisJsonPath: relativeAnalysisJsonPath,
      rulesPath: relativeRulesPath,
    }),
  );

  const {
    scaffoldCreated,
    scaffoldRefreshed,
    rulesMigrated,
    rulesMigrationEntries,
  } = await writeProjectRulesFile({
    analysis,
    analysisJsonPath,
    analysisPath,
    previousAnalysis,
    rootDir,
    rulesPath,
  });

  printProjectRulesResult({
    analysisJsonPath,
    analysisPath,
    rulesPath,
    scaffoldCreated,
    scaffoldRefreshed,
    rulesMigrated,
    rulesMigrationEntries,
  });
}

export { runProjectRules };
