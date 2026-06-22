function parseInitArgs(argv) {
  let sourceUrl = null;
  let noInput = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--source-url') {
      sourceUrl = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--source-url=')) {
      sourceUrl = arg.slice('--source-url='.length) || null;
      continue;
    }

    if (arg === '--no-input') {
      noInput = true;
    }
  }

  return { noInput, sourceUrl };
}

export { parseInitArgs };
