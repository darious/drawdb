export function normalizeRelationshipPair(pair) {
  if (!pair) return null;

  const startFieldId = pair.startFieldId ?? pair.fromFieldId;
  const endFieldId = pair.endFieldId ?? pair.toFieldId;

  if (startFieldId == null || endFieldId == null) {
    return null;
  }

  return {
    startFieldId,
    endFieldId,
  };
}

export function getRelationshipPairs(relationship) {
  const pairs = Array.isArray(relationship?.columnPairs)
    ? relationship.columnPairs.map(normalizeRelationshipPair).filter(Boolean)
    : [];

  if (pairs.length > 0) {
    return pairs;
  }

  const fallbackPair = normalizeRelationshipPair({
    startFieldId: relationship?.startFieldId,
    endFieldId: relationship?.endFieldId,
  });

  return fallbackPair ? [fallbackPair] : [];
}

export function getPrimaryRelationshipPair(relationship) {
  return getRelationshipPairs(relationship)[0] ?? null;
}

export function normalizeRelationship(relationship) {
  const columnPairs = getRelationshipPairs(relationship);
  const primaryPair = columnPairs[0] ?? { startFieldId: null, endFieldId: null };

  return {
    ...relationship,
    startFieldId: primaryPair.startFieldId,
    endFieldId: primaryPair.endFieldId,
    columnPairs,
  };
}

export function normalizeRelationships(relationships = []) {
  return relationships.map(normalizeRelationship);
}

export function relationshipReferencesField(relationship, tableId, fieldId) {
  if (
    relationship.startTableId !== tableId &&
    relationship.endTableId !== tableId
  ) {
    return false;
  }

  return getRelationshipPairs(relationship).some(
    (pair) =>
      (relationship.startTableId === tableId && pair.startFieldId === fieldId) ||
      (relationship.endTableId === tableId && pair.endFieldId === fieldId),
  );
}

export function getRelationshipFieldNames(relationship, tables = []) {
  const startTable = tables.find((table) => table.id === relationship.startTableId);
  const endTable = tables.find((table) => table.id === relationship.endTableId);
  if (!startTable || !endTable) return null;

  const pairs = getRelationshipPairs(relationship)
    .map((pair) => {
      const startField = startTable.fields.find((field) => field.id === pair.startFieldId);
      const endField = endTable.fields.find((field) => field.id === pair.endFieldId);

      if (!startField || !endField) return null;

      return {
        startFieldId: pair.startFieldId,
        endFieldId: pair.endFieldId,
        startFieldName: startField.name,
        endFieldName: endField.name,
      };
    })
    .filter(Boolean);

  if (pairs.length === 0) return null;

  return {
    startTable,
    endTable,
    pairs,
    primaryPair: pairs[0],
  };
}
