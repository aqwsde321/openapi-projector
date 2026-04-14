import { catalogCommand } from './catalog.mjs';
import { downloadCommand } from './download.mjs';
import { generateCommand } from './generate.mjs';

const refreshCommand = {
  name: 'refresh',
  async run(options = {}) {
    await downloadCommand.run(options);
    await catalogCommand.run(options);
    await generateCommand.run(options);
  },
};

export { refreshCommand };
