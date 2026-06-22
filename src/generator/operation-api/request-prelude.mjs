import {
  buildDestructuringEntries,
  buildObjectLiteral,
} from './request-expressions.mjs';

function buildRequestPreludeLines({
  pathFields,
  headerFields,
  cookieFields,
  usesRestQuery,
  usesRestBody,
  usesPathDestructure,
  usesNestedRequest,
}) {
  const functionBodyLines = [];

  if (usesRestQuery || usesRestBody) {
    functionBodyLines.push(
      `  const { ${buildDestructuringEntries(pathFields).join(', ')}, ...${
        usesRestQuery ? 'params' : 'data'
      } } = requestDto;`,
    );
  } else if (usesPathDestructure) {
    functionBodyLines.push(
      `  const { ${buildDestructuringEntries(pathFields).join(', ')} } = requestDto;`,
    );
  }

  if (headerFields.length > 0) {
    const headerSource = usesNestedRequest
      ? 'requestDto.headers ?? {}'
      : buildObjectLiteral(headerFields, 'requestDto');
    functionBodyLines.push(
      `  const headers = Object.fromEntries(Object.entries(${headerSource}).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])) as Record<string, string>;`,
    );
  }

  if (cookieFields.length > 0) {
    const cookieSource = usesNestedRequest
      ? 'requestDto.cookies ?? {}'
      : buildObjectLiteral(cookieFields, 'requestDto');
    functionBodyLines.push(
      `  const cookieEntries = Object.entries(${cookieSource}).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => \`\${encodeURIComponent(key)}=\${encodeURIComponent(String(value))}\`);`,
    );
    if (headerFields.length === 0) {
      functionBodyLines.push('  const headers = {} as Record<string, string>;');
    }
    functionBodyLines.push("  if (cookieEntries.length > 0) headers.Cookie = cookieEntries.join('; ');");
  }

  return functionBodyLines;
}

export { buildRequestPreludeLines };
