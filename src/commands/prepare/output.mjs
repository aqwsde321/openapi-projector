import { formatSuccess } from '../../cli/format.mjs';

function logPrepareStart(rootDir) {
  console.log(formatSuccess(`prepare: running in ${rootDir}`));
}

function logPrepareStep(command, description) {
  console.log('');
  console.log(formatSuccess(`${command}: ${description}`));
}

function logPrepareComplete() {
  console.log('');
  console.log(formatSuccess('prepare complete: openapi/project/summary.md를 확인하세요.'));
}

function logInitSkipped() {
  console.log(formatSuccess('init: skipped because project config already exists'));
}

export {
  logInitSkipped,
  logPrepareComplete,
  logPrepareStart,
  logPrepareStep,
};
