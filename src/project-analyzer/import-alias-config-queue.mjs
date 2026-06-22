import path from 'node:path';

function resolveProjectReferenceConfig(referencePath) {
  if (path.extname(referencePath)) {
    return referencePath;
  }

  return path.join(referencePath, 'tsconfig.json');
}

function createInitialConfigQueue(rootDir) {
  return ['tsconfig.json', 'jsconfig.json'].map((configName) =>
    path.join(rootDir, configName),
  );
}

function appendProjectReferenceConfigs(queue, projectReferences) {
  queue.push(
    ...projectReferences.map((reference) =>
      resolveProjectReferenceConfig(reference.path),
    ),
  );
}

export { appendProjectReferenceConfigs, createInitialConfigQueue };
