import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TSC_CLI = path.join(REPO_ROOT, 'node_modules', 'typescript', 'lib', 'tsc.js');

export { REPO_ROOT, TSC_CLI };
