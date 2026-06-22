import { formatSuccess } from '../../cli/format.mjs';

function printCatalogSummary({
  catalogEntries,
  catalogJsonPath,
  changeSummary,
  changesIndexMarkdownPath,
}) {
  console.log(formatSuccess(
    `Generated ${catalogEntries.length} endpoint catalog item(s) into ${catalogJsonPath}`,
  ));
  console.log(formatSuccess(`Latest change summary: ${changesIndexMarkdownPath}`));
  console.log(
    `Catalog changes: +${changeSummary.added.length} / -${changeSummary.removed.length} / ~contract ${changeSummary.contractChanged.length} / ~doc ${changeSummary.docChanged.length}`,
  );
}

export { printCatalogSummary };
