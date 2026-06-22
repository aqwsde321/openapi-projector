import path from 'node:path';

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

function relativePosixPath(rootDir, targetPath) {
  return toPosixPath(path.relative(rootDir, targetPath));
}

function toProjectRelativePath(rootDir, filePath) {
  return relativePosixPath(rootDir, filePath);
}

function stripLeadingDotSlash(value) {
  return value.replace(/^\.\//, '');
}

export {
  relativePosixPath,
  stripLeadingDotSlash,
  toPosixPath,
  toProjectRelativePath,
};
