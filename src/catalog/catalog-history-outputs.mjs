import {
  buildHistoryFileName,
  hasRecordedChanges,
  renderChangeMarkdown,
} from './changes/change-report.mjs';
import { resolveCatalogHistoryPaths } from '../config/project-paths.mjs';
import { writeJson, writeText } from '../io/files.mjs';

async function writeCatalogHistoryOutputs({
  changeSummary,
  historyDir,
  markdownChangeSummary,
  rootDir,
}) {
  if (!hasRecordedChanges(changeSummary)) {
    return;
  }

  const historyFileName = buildHistoryFileName(changeSummary.generatedAt);
  const { historyJsonPath, historyMarkdownPath } = resolveCatalogHistoryPaths(
    historyDir,
    historyFileName,
  );
  await writeJson(historyJsonPath, changeSummary);
  await writeText(
    historyMarkdownPath,
    renderChangeMarkdown(markdownChangeSummary, {
      rootDir,
      markdownDir: historyDir,
    }),
  );
}

export { writeCatalogHistoryOutputs };
