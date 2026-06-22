function renderTypeArraySchemaType(schema, renderType) {
  if (!Array.isArray(schema.type)) {
    return null;
  }

  const renderedTypes = schema.type.map((typeName) => {
    if (typeName === 'null') {
      return 'null';
    }

    return renderType({
      ...schema,
      type: typeName,
      nullable: false,
    });
  });

  if (schema.nullable) {
    renderedTypes.push('null');
  }

  return Array.from(new Set(renderedTypes)).join(' | ');
}

export { renderTypeArraySchemaType };
