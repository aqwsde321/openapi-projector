import {
  formatExternalMarkdownLink,
  formatMarkdownLink,
} from '../../markdown-format.mjs';

function formatChangeItemTitle(item) {
  const swaggerLink = item.swaggerUrl
    ? ` ${formatExternalMarkdownLink('Swagger', item.swaggerUrl)}`
    : '';

  return `[${item.method.toUpperCase()}] \`${item.path}\`${item.summary ? ` - ${item.summary}` : ''}${swaggerLink}`;
}

function formatProjectFileLinks(item, options = {}) {
  if (!item.projectFiles) {
    return null;
  }

  const links = [];

  if (item.projectFiles.dto) {
    links.push(formatMarkdownLink('DTO', item.projectFiles.dto, options));
  }

  if (item.projectFiles.api) {
    links.push(formatMarkdownLink('API', item.projectFiles.api, options));
  }

  return links.length > 0 ? links.join(' / ') : null;
}

export {
  formatChangeItemTitle,
  formatProjectFileLinks,
};
