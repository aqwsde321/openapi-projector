function buildApiFunctionSignature({
  bodyTypeName,
  hasAnyInputs,
  responseTypeName,
}) {
  const apiTypeImports = new Set([responseTypeName]);

  if (!hasAnyInputs) {
    return {
      apiTypeImports,
      signature: `(): Promise<${responseTypeName}>`,
    };
  }

  apiTypeImports.add(bodyTypeName);
  return {
    apiTypeImports,
    signature: `(requestDto: ${bodyTypeName}): Promise<${responseTypeName}>`,
  };
}

export { buildApiFunctionSignature };
