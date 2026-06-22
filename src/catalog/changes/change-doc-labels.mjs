import { parseFormattedPath } from '../format/path.mjs';
import {
  formatSchemaDocumentationPathLabel,
} from './change-schema-doc-labels.mjs';

const DOCUMENTATION_FIELD_LABELS = {
  summary: '요약',
  description: '설명',
  operationId: 'operationId',
  tags: '태그',
  externalDocs: '외부 문서',
  example: '예시',
  examples: '예시',
  title: '제목',
  deprecated: 'deprecated',
};

function formatDocumentationPathLabel(detailPath) {
  const directLabel = getDocumentationFieldLabel(detailPath);
  if (directLabel) {
    return directLabel;
  }

  const pathSegments = parseFormattedPath(detailPath);
  const fieldLabel = getDocumentationFieldLabel(pathSegments.at(-1));

  if (!fieldLabel) {
    return null;
  }

  if (pathSegments[0] === 'operation') {
    return formatOperationDocumentationPathLabel(pathSegments, fieldLabel);
  }

  if (['requestBody', 'responses', 'parameters'].includes(pathSegments[0])) {
    return formatOperationDocumentationPathLabel(['operation', ...pathSegments], fieldLabel);
  }

  if (pathSegments[0] === 'referencedSchemas') {
    return formatSchemaDocumentationPathLabel(pathSegments, fieldLabel);
  }

  return `문서 ${fieldLabel}`;
}

function getDocumentationFieldLabel(fieldName) {
  return DOCUMENTATION_FIELD_LABELS[fieldName] ?? null;
}

function formatOperationDocumentationPathLabel(pathSegments, fieldLabel) {
  const section = pathSegments[1];

  if (section === 'requestBody') {
    return `요청 Body ${fieldLabel}`;
  }

  if (section === 'responses' && pathSegments[2]) {
    return `응답 ${pathSegments[2]} ${fieldLabel}`;
  }

  if (section === 'parameters') {
    const parameterIndex = Number(pathSegments[2]);
    const parameterLabel = Number.isInteger(parameterIndex)
      ? `#${parameterIndex + 1}`
      : pathSegments[2];
    return `파라미터 ${parameterLabel} ${fieldLabel}`;
  }

  return `문서 ${fieldLabel}`;
}

export { formatDocumentationPathLabel };
