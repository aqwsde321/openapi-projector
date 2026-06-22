import {
  toCamelCase,
} from '../../core/text-utils.mjs';

function getDestructuredLocalName(propertyName) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
    return propertyName;
  }

  return toCamelCase(propertyName);
}

function buildPathTemplateExpression(template, getValueExpression) {
  return `\`${template.replace(
    /\{([^}]+)\}/g,
    (_, key) => `\${encodeURIComponent(String(${getValueExpression(key)}))}`,
  )}\``;
}

function buildObjectLiteral(entries, sourceExpression) {
  return `{ ${entries
    .map((entry) => `${JSON.stringify(entry.name)}: ${sourceExpression}[${JSON.stringify(entry.name)}]`)
    .join(', ')} }`;
}

function buildDestructuringEntries(entries) {
  return entries.map((entry) => {
    const propertyName = String(entry.name);
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
      return propertyName;
    }
    return `${JSON.stringify(propertyName)}: ${getDestructuredLocalName(propertyName)}`;
  });
}

export {
  buildDestructuringEntries,
  buildObjectLiteral,
  buildPathTemplateExpression,
  getDestructuredLocalName,
};
