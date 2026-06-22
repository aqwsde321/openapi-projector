import { relativePosixPath } from '../../core/path-utils.mjs';
import { buildScaffoldDefaultsFromAnalysis } from '../../project-rules/scaffold-candidates.mjs';
import { buildRulesJsonc } from './jsonc-renderer.mjs';

function buildProjectRulesScaffoldSource({
  analysis,
  analysisJsonPath,
  analysisPath,
  rootDir,
}) {
  const scaffoldDefaults = buildScaffoldDefaultsFromAnalysis(analysis);
  const nextRulesSource = buildRulesJsonc({
    analysisPath: relativePosixPath(rootDir, analysisPath),
    analysisJsonPath: relativePosixPath(rootDir, analysisJsonPath),
    fetchApiImportPath: scaffoldDefaults.api.fetchApiImportPath,
    fetchApiSymbol: scaffoldDefaults.api.fetchApiSymbol,
    fetchApiImportKind: scaffoldDefaults.api.fetchApiImportKind,
    adapterStyle: scaffoldDefaults.api.adapterStyle,
    hooks: scaffoldDefaults.hooks,
    reviewNotes: scaffoldDefaults.reviewNotes,
  });

  return {
    nextRulesSource,
    scaffoldDefaults,
  };
}

export { buildProjectRulesScaffoldSource };
