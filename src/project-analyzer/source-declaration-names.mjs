const FUNCTION_PREFIXES = [
  'get',
  'fetch',
  'load',
  'request',
  'create',
  'update',
  'delete',
  'remove',
  'post',
  'put',
  'patch',
];
const DTO_SUFFIXES = ['Dto', 'Response', 'Request', 'Model', 'Payload'];

function collectPrefix(name) {
  return (
    FUNCTION_PREFIXES.find((prefix) =>
      name === prefix ||
      name.startsWith(`${prefix[0].toUpperCase()}${prefix.slice(1)}`) ||
      name.startsWith(prefix),
    ) ?? null
  );
}

function collectDtoSuffix(name) {
  return DTO_SUFFIXES.find((suffix) => name.endsWith(suffix)) ?? null;
}

export { collectDtoSuffix, collectPrefix };
