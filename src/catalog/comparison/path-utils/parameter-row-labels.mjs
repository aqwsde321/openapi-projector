import { stripMarkdownFormatting } from '../../format/inline.mjs';

const PARAMETER_CATEGORIES = [
  ['query', 'Query Parameter', '요청 Query 파라미터'],
  ['path', 'Path Parameter', '요청 Path 파라미터'],
  ['header', 'Header Parameter', '요청 Header 파라미터'],
  ['cookie', 'Cookie Parameter', '요청 Cookie 파라미터'],
];

function localizeParameterCategory(category, parameterLocation) {
  const match = PARAMETER_CATEGORIES.find(([location, sourceCategory]) =>
    parameterLocation === location ||
    category === sourceCategory ||
    category.includes(sourceCategory)
  );
  if (!match) {
    return null;
  }

  const [location, sourceCategory, label] = match;
  return parameterLocation === location || category === sourceCategory
    ? label
    : `${label} 필드`;
}

function inferParameterLocation(row) {
  const parameterKey = parseParameterTarget(row?.target);
  if (parameterKey) {
    return parameterKey.split('.')[0] || null;
  }

  const category = String(row?.category ?? '');
  return (
    PARAMETER_CATEGORIES.find(([, sourceCategory]) =>
      category === sourceCategory
    )?.[0] ?? null
  );
}

function parseParameterTarget(target) {
  const match = stripMarkdownFormatting(target).match(/parameters\["([^"]+)"\]/);
  return match ? match[1] : null;
}

export {
  inferParameterLocation,
  localizeParameterCategory,
  parseParameterTarget,
};
