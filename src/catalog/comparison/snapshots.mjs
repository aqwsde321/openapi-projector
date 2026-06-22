function getComparisonSnapshots(comparisonContext) {
  return [
    comparisonContext?.nextSnapshot,
    comparisonContext?.previousSnapshot,
  ].filter(Boolean);
}

function getComparisonSnapshotForSide(comparisonContext, side) {
  return side === 'previous'
    ? comparisonContext?.previousSnapshot
    : comparisonContext?.nextSnapshot;
}

function findOperationParameter(snapshot, location, name) {
  return (snapshot?.operation?.parameters ?? []).find((candidate) =>
    candidate?.in === location && candidate?.name === name
  );
}

export {
  findOperationParameter,
  getComparisonSnapshotForSide,
  getComparisonSnapshots,
};
