function renderOpenapiGitignore() {
  return [
    '# openapi-projector generated artifacts',
    'changes.md',
    'changes.json',
    '_internal/',
    'review/',
    'project/',
    '',
  ].join('\n');
}

export { renderOpenapiGitignore };
