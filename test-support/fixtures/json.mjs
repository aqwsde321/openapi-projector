import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson } from '#src/io/files.mjs';

const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test/fixtures');

async function readFixtureJson(fileName) {
  return readJson(path.join(FIXTURES_DIR, fileName));
}

function jsonDataUrl(value) {
  return `data:application/json,${encodeURIComponent(JSON.stringify(value))}`;
}

export { jsonDataUrl, readFixtureJson };
