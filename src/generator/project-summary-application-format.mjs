function formatMedia(value) {
  return value ? `\`${value}\`` : '`none`';
}

function formatFields(fields) {
  if (!fields || fields.length === 0) {
    return 'none';
  }

  const visibleFields = fields.slice(0, 8).map((field) => {
    const optionalMarker = field.required ? '' : '?';
    return `\`${field.name}${optionalMarker}: ${field.type}\``;
  });
  const hiddenCount = fields.length - visibleFields.length;

  return hiddenCount > 0
    ? `${visibleFields.join(', ')}, +${hiddenCount} more`
    : visibleFields.join(', ');
}

function formatParams(label, params) {
  if (!params || params.length === 0) {
    return null;
  }

  return `${label}: ${formatFields(params)}`;
}

function formatSchemaBody(body) {
  if (!body || body.shape === 'none') {
    return 'none';
  }

  const schemaLabel = body.schema ? `\`${body.schema}\`` : `\`${body.shape}\``;
  return `${schemaLabel}; fields: ${formatFields(body.fields)}`;
}

export {
  formatMedia,
  formatParams,
  formatSchemaBody,
};
