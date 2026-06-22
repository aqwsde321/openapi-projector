function installSkillUsage() {
  return [
    'Usage:',
    '  openapi-projector install-skill [options]',
    '',
    'Options:',
    '  --agent codex          Install for Codex. This is the default and currently supported agent.',
    '  --target-dir <path>    Install to a custom skill directory instead of ~/.codex/skills/openapi-projector.',
    '  --force                Replace an existing installed skill.',
    '  --dry-run              Print the target path without writing files.',
    '  --yes                 Accepted for agent-driven flows; install-skill does not prompt.',
    '  --help                 Show this help.',
  ].join('\n');
}

export { installSkillUsage };
