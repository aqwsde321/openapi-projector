import { relativePosixPath } from '../../core/path-utils.mjs';

function toDoctorRelativePath(rootDir, targetPath) {
  return relativePosixPath(rootDir, targetPath) || '.';
}

function isProjectConfigMissingError(error) {
  return error.message?.startsWith('Project config not found.');
}

export {
  isProjectConfigMissingError,
  toDoctorRelativePath,
};
