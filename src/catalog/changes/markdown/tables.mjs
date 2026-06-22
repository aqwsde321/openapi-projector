import { buildComparisonTableRows } from '../../comparison/rows.mjs';
import { formatInlineCode } from '../../format/inline.mjs';
import { formatDisplayCell } from '../../markdown-format.mjs';

function appendComparisonTable(lines, rows, tableRows = null, indent = '') {
  const renderedRows = Array.isArray(tableRows) && tableRows.length > 0
    ? tableRows
    : buildComparisonTableRows(rows);

  lines.push(
    '',
    `${indent}| 변경 | 위치 | AS-IS | TO-BE |`,
    `${indent}| --- | --- | --- | --- |`,
    ...renderedRows.map((row) =>
      `${indent}| ${formatDisplayCell(row.change)} | ${formatDisplayCell(row.location)} | ${formatComparisonTableCell(row.previous)} | ${formatComparisonTableCell(row.next)} |`,
    ),
  );
}

function formatComparisonTableCell(value) {
  const text = formatDisplayCell(value);
  return text === '없음' ? text : formatInlineCode(text);
}

function appendEndpointPreviewDetails(lines, endpointPreview, indent = '') {
  lines.push('');
  lines.push(`${indent}<details>`);
  lines.push(`${indent}<summary>전체 AS-IS / TO-BE 보기</summary>`);
  appendEndpointPreviewTable(lines, endpointPreview, indent);
  lines.push(`${indent}</details>`);
}

function appendEndpointPreviewTable(lines, endpointPreview, indent = '') {
  lines.push(
    '',
    `${indent}| AS-IS | TO-BE |`,
    `${indent}| --- | --- |`,
    ...(endpointPreview.rows ?? []).map(
      (row) => `${indent}| ${row.previous} | ${row.next} |`,
    ),
  );
}

export {
  appendComparisonTable,
  appendEndpointPreviewDetails,
};
