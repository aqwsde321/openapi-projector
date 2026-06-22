import { createInterface } from 'node:readline/promises';

import {
  resolveReachableSourceUrl,
} from './check.mjs';

const DEFAULT_SOURCE_URL = 'http://localhost:8080/v3/api-docs';

async function promptForSourceUrl({ defaultSourceUrl, fetchImpl, stdin, stdout }) {
  stdout.write(`Default sourceUrl: ${defaultSourceUrl}\n`);
  stdout.write('Press Enter to keep it, or paste a different OpenAPI JSON URL.\n');

  const readline = createInterface({ input: stdin, output: stdout, terminal: false });
  let lastCheckedSourceUrl = defaultSourceUrl;
  try {
    while (true) {
      const answer = await readline.question(`OpenAPI JSON URL [${defaultSourceUrl}]: `);
      const trimmed = answer.trim();
      if (trimmed.toLowerCase() === 'skip') {
        stdout.write(`Skipping reachability check. Saving sourceUrl anyway: ${lastCheckedSourceUrl}\n`);
        return lastCheckedSourceUrl;
      }

      const sourceUrl = trimmed || defaultSourceUrl;
      lastCheckedSourceUrl = sourceUrl;
      const result = await resolveReachableSourceUrl({
        fetchImpl,
        sourceUrl,
        stdout,
      });

      if (result.ok) {
        return result.sourceUrl;
      }

      if (result.suggestedSourceUrl) {
        lastCheckedSourceUrl = result.suggestedSourceUrl;
        stdout.write(`Best OpenAPI JSON URL candidate so far: ${result.suggestedSourceUrl}\n`);
      }
      stdout.write('\nCould not find a reachable OpenAPI JSON URL. Paste another URL, type "skip" to save this URL anyway, or press Ctrl+C to cancel.\n');
    }
  } finally {
    readline.close();
  }
}

function shouldPromptForSourceUrl({ context, initArgs, stdin, stdout }) {
  if (initArgs.noInput || initArgs.sourceUrl) {
    return false;
  }

  if (typeof context.interactive === 'boolean') {
    return context.interactive;
  }

  return Boolean(stdin?.isTTY && stdout?.isTTY);
}

export {
  DEFAULT_SOURCE_URL,
  promptForSourceUrl,
  shouldPromptForSourceUrl,
};
