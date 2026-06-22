import {
  inferParameterLocation,
  localizeParameterCategory,
} from '../path-utils/parameter-row-labels.mjs';

function localizeComparisonCategory(row) {
  const category = String(row?.category ?? '');
  const parameterLocation = inferParameterLocation(row);

  if (category.includes('Request Body Schema')) {
    return '요청 Body schema';
  }
  if (category.includes('Response Body Schema')) {
    return '응답 Body schema';
  }

  const parameterCategory = localizeParameterCategory(
    category,
    parameterLocation,
  );
  if (parameterCategory) {
    return parameterCategory;
  }

  if (category.includes('Request/Response Body')) {
    return '요청/응답 Body 필드';
  }
  if (category.includes('Request Body/Header')) {
    return '요청 Body/Header 필드';
  }
  if (category.includes('Response Body/Header')) {
    return '응답 Body/Header 필드';
  }
  if (category.includes('Request Body')) {
    return '요청 Body 필드';
  }
  if (category.includes('Response Body')) {
    return '응답 Body 필드';
  }
  if (category.includes('Request Header')) {
    return '요청 Header 필드';
  }
  if (category.includes('Response Header')) {
    return '응답 Header 필드';
  }
  if (category === 'Documentation') {
    return '문서';
  }

  return category || '계약';
}

export { localizeComparisonCategory };
