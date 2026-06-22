import { normalizeText } from '../../core/text-utils.mjs';

function renderFieldList(items) {
  if (items.length === 0) {
    return '- 없음';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function renderMediaTypes(mediaTypes) {
  if (mediaTypes.length === 0) {
    return '(none)';
  }

  return mediaTypes.map((item) => `\`${item}\``).join(', ');
}

function renderParameterSection(parameters) {
  if (parameters.length === 0) {
    return '- 없음';
  }

  return parameters
    .map((parameter) => {
      const requiredText = parameter.required ? 'required' : 'optional';
      const schemaType = parameter.schema?.type ?? (parameter.schema?.$ref ? 'ref' : 'unknown');
      const description = normalizeText(parameter.description);
      return `- \`${parameter.in}.${parameter.name}\` (${requiredText}, ${schemaType})${description ? ` - ${description}` : ''}`;
    })
    .join('\n');
}

function renderRequestBodySection({ requestBody, requestMediaTypes }) {
  if (!requestBody) {
    return '- 없음';
  }

  return renderFieldList([
    `Required: ${requestBody.required ? 'yes' : 'no'}`,
    `Media Types: ${renderMediaTypes(requestMediaTypes)}`,
  ]);
}

function renderSuccessResponseSection({ responseMediaTypes, successStatus }) {
  if (!successStatus) {
    return '- 없음';
  }

  return renderFieldList([
    `Status: \`${successStatus}\``,
    `Media Types: ${renderMediaTypes(responseMediaTypes)}`,
  ]);
}

export {
  renderParameterSection,
  renderRequestBodySection,
  renderSuccessResponseSection,
};
