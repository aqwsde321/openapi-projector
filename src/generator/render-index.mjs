function renderTagIndexSource(endpointFiles) {
  const lines = [];
  for (const { endpointFileBase } of endpointFiles) {
    lines.push(`export * from './${endpointFileBase}.dto';`);
    lines.push(`export * from './${endpointFileBase}.api';`);
  }
  lines.push('');

  return lines.join('\n');
}

function renderIndexSource(tagDirectoryNames, schemaFileBase = 'schema') {
  const lines = [`export * from './${schemaFileBase}';`];

  for (const tagDirectoryName of tagDirectoryNames) {
    lines.push(`export * from ${JSON.stringify(`./${tagDirectoryName}`)};`);
  }

  lines.push('');
  return lines.join('\n');
}

function renderFlatIndexSource(endpointFiles, schemaFileBase = 'schema') {
  return [
    `export * from './${schemaFileBase}';`,
    renderTagIndexSource(endpointFiles).trimEnd(),
    '',
  ]
    .filter((line, index, lines) => line || index === lines.length - 1)
    .join('\n');
}

export {
  renderFlatIndexSource,
  renderIndexSource,
  renderTagIndexSource,
};
