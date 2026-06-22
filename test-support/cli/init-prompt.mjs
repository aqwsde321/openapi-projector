import { Readable } from 'node:stream';

import { initCommand } from '#src/commands/init.mjs';

async function runInitPrompt({ fetch, input, stdout, targetRoot }) {
  await initCommand.run({
    argv: [],
    context: {
      interactive: true,
      fetch,
      stdin: Readable.from(input),
      stdout,
      targetRoot,
    },
  });
}

export { runInitPrompt };
