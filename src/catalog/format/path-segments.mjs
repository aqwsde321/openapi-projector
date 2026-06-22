function formatPathSegments(pathSegments) {
  if (pathSegments.length === 0) {
    return '(root)';
  }

  return pathSegments
    .map((segment, index) => {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
        return index === 0 ? segment : `.${segment}`;
      }

      return `[${JSON.stringify(segment)}]`;
    })
    .join('');
}

export { formatPathSegments };
