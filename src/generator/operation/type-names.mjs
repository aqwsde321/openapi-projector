import { toPascalIdentifier } from '../../projector/naming.mjs';

function buildOperationTypeNames(functionName) {
  const dtoBaseName = toPascalIdentifier(functionName);

  return {
    bodyTypeName: `${dtoBaseName}RequestDto`,
    responseTypeName: `${dtoBaseName}ResponseDto`,
    requestShapeName: `${dtoBaseName}Body`,
  };
}

export { buildOperationTypeNames };
