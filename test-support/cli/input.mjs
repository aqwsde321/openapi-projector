async function* delayedLines(lines) {
  for (const line of lines) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    yield line;
  }
}

export { delayedLines };
