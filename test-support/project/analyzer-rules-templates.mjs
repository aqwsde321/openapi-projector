function defaultProjectRulesTemplate() {
  return `{
  // MVP v2 project-rules template 입니다.
  "api": {
    "fetchApiImportPath": "@/shared/api",
    "fetchApiSymbol": "fetchAPI",
    "fetchApiImportKind": "named",
    "adapterStyle": "url-config",
    // "tag" creates tag folders. "flat" writes endpoint files directly under the generated root.
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
`;
}

function legacyProjectRulesTemplate() {
  return `{
  // MVP v2 project-rules template 입니다.
  "api": {
    "fetchApiImportPath": "@/shared/api",
    "fetchApiSymbol": "fetchAPI",
    "adapterStyle": "url-config",
    // "tag" creates tag folders. "flat" writes endpoint files directly under the generated root.
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
`;
}

export { defaultProjectRulesTemplate, legacyProjectRulesTemplate };
