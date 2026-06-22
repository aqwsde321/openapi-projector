import {
  pathExists,
  readJson,
} from '../../io/files.mjs';

async function readPreviousAnalysis(analysisJsonPath) {
  if (!(await pathExists(analysisJsonPath))) {
    return null;
  }

  try {
    return await readJson(analysisJsonPath);
  } catch {
    return null;
  }
}

export { readPreviousAnalysis };
