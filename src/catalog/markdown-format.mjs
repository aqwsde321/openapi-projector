import path from 'node:path';

import {
  relativePosixPath,
  toPosixPath,
} from '../core/path-utils.mjs';

function escapeMarkdownTableHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMarkdownTableCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function formatMarkdownLink(label, projectRelativePath, options = {}) {
  return `[${label}](${formatMarkdownDestination(
    resolveMarkdownTarget(projectRelativePath, options),
  )})`;
}

function resolveMarkdownTarget(projectRelativePath, options = {}) {
  const normalizedProjectPath = toPosixPath(projectRelativePath);

  if (!options.rootDir || !options.markdownDir) {
    return normalizedProjectPath;
  }

  const absoluteTargetPath = path.resolve(options.rootDir, normalizedProjectPath);
  return relativePosixPath(options.markdownDir, absoluteTargetPath);
}

function formatMarkdownDestination(target) {
  return `<${target.replaceAll('>', '%3E')}>`;
}

function formatExternalMarkdownLink(label, url) {
  return `[${label}](${formatMarkdownDestination(url)})`;
}

function formatDisplayCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

export {
  escapeMarkdownTableCell,
  escapeMarkdownTableHtml,
  formatDisplayCell,
  formatExternalMarkdownLink,
  formatMarkdownLink,
};
