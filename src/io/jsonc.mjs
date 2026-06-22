import { stripJsonComments } from './jsonc-comments.mjs';
import { stripJsonTrailingCommas } from './jsonc-trailing-commas.mjs';

function parseJsonc(rawText) {
  return JSON.parse(stripJsonTrailingCommas(stripJsonComments(rawText)));
}

export { parseJsonc };
