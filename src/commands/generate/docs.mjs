import { buildEndpointDocDetails } from './doc-details.mjs';
import {
  renderParameterSection,
  renderRequestBodySection,
  renderSuccessResponseSection,
} from './doc-sections.mjs';

function renderEndpointDoc({ entry, spec }) {
  const {
    parameters,
    requestBody,
    requestMediaTypes,
    responseMediaTypes,
    successStatus,
    tags,
  } = buildEndpointDocDetails({ entry, spec });

  return [
    `# ${entry.id}`,
    '',
    `- Method: \`${entry.method.toUpperCase()}\``,
    `- Path: \`${entry.path}\``,
    `- OperationId: ${entry.operationId ? `\`${entry.operationId}\`` : '(none)'}`,
    `- Tags: ${tags.length > 0 ? tags.map((tag) => `\`${tag}\``).join(', ') : '(none)'}`,
    '',
    '## Summary',
    '',
    entry.summary || '(none)',
    '',
    '## Description',
    '',
    entry.description || '(none)',
    '',
    '## Parameters',
    '',
    renderParameterSection(parameters),
    '',
    '## Request Body',
    '',
    renderRequestBodySection({ requestBody, requestMediaTypes }),
    '',
    '## Success Response',
    '',
    renderSuccessResponseSection({ responseMediaTypes, successStatus }),
    '',
  ].join('\n');
}

export {
  renderEndpointDoc,
};
