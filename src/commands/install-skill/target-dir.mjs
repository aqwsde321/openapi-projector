import os from 'node:os';
import path from 'node:path';

function resolveInstallSkillTargetDir(targetDir, skillName) {
  if (targetDir) {
    return path.resolve(targetDir);
  }

  return path.join(os.homedir(), '.codex', 'skills', skillName);
}

export { resolveInstallSkillTargetDir };
