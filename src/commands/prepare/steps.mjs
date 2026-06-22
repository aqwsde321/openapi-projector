import { catalogCommand } from '../catalog.mjs';
import { downloadCommand } from '../download.mjs';
import { generateCommand } from '../generate.mjs';
import { initCommand } from '../init.mjs';
import { projectCommand } from '../project.mjs';
import { rulesCommand } from '../rules.mjs';

async function runInitStep(options) {
  await initCommand.run(options);
}

async function runRefreshSteps(options) {
  await downloadCommand.run(options);
  await catalogCommand.run(options);
  await generateCommand.run(options);
}

async function runRulesStep(options) {
  await rulesCommand.run(options);
}

async function runProjectStep(options) {
  await projectCommand.run(options);
}

export {
  runInitStep,
  runProjectStep,
  runRefreshSteps,
  runRulesStep,
};
