function javaTypeFromOpenApiType(type, format = null) {
  if (type === 'string') {
    if (format === 'uuid') {
      return 'UUID';
    }
    if (format === 'date') {
      return 'LocalDate';
    }
    if (format === 'date-time') {
      return 'OffsetDateTime';
    }
    if (format === 'binary') {
      return 'MultipartFile';
    }
    return 'String';
  }

  if (type === 'integer') {
    return format === 'int64' ? 'Long' : 'Integer';
  }

  if (type === 'number') {
    if (format === 'float') {
      return 'Float';
    }
    if (format === 'double') {
      return 'Double';
    }
    return 'BigDecimal';
  }

  if (type === 'boolean') {
    return 'Boolean';
  }

  if (type === 'object') {
    return 'Map<String, Object>';
  }

  if (['unknown', 'oneOf', 'anyOf', 'allOf'].includes(type)) {
    return 'Object';
  }

  return null;
}

export { javaTypeFromOpenApiType };
