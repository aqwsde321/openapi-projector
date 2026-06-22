function getCommandContext(options = {}) {
  return Array.isArray(options) ? {} : (options.context ?? {});
}

function getCommandArgv(options = {}) {
  return Array.isArray(options) ? options : (options.argv ?? []);
}

function resolveCommandRoot(options = {}, { defaultRoot = process.cwd() } = {}) {
  const context = getCommandContext(options);
  return context.targetRoot ?? defaultRoot;
}

export {
  getCommandArgv,
  getCommandContext,
  resolveCommandRoot,
};
