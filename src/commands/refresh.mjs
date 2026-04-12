import { catalogCommand } from './catalog.mjs';
import { downloadCommand } from './download.mjs';
import { generateCommand } from './generate.mjs';

const refreshCommand = {
  name: 'refresh',
  async run() {
    await downloadCommand.run();
    await catalogCommand.run();
    await generateCommand.run();
  },
};

export { refreshCommand };
