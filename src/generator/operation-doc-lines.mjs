function renderApiFunctionDocLines(docText) {
  if (!docText) {
    return [];
  }

  return [
    '/**',
    ...docText.split('\n').map((docLine) => ` * ${docLine}`),
    ' */',
  ];
}

export { renderApiFunctionDocLines };
