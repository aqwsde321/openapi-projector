import {
  CATALOG_FORMAT_VERSION,
  buildChangeSummary,
  hasRecordedChanges,
} from './change-summary.mjs';
import { withEndpointPreviews } from './change-endpoint-previews.mjs';
import { renderChangeMarkdown } from './markdown/change-markdown.mjs';

function buildHistoryFileName(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}-${millis}`;
}

export {
  CATALOG_FORMAT_VERSION,
  buildChangeSummary,
  buildHistoryFileName,
  hasRecordedChanges,
  renderChangeMarkdown,
  withEndpointPreviews,
};
