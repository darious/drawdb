import { Cardinality, DB, Constraint, defaultBlue } from "../../data/constants";
import {
  normalizeSubjectArea,
  normalizeTableMetadata,
} from "../../utils/tableMetadata";

function slugify(value, fallback) {
  const slug = `${value ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || fallback;
}

function makeUniqueKey(preferredValue, fallbackValue, usedKeys) {
  const baseKey = slugify(preferredValue, fallbackValue);
  let key = baseKey;
  let suffix = 2;

  while (usedKeys.has(key)) {
    key = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(key);
  return key;
}

function mapFieldToYaml(field) {
  const yamlField = {
    id: field.id,
    name: field.name,
    type: `${field.type ?? ""}`.toLowerCase(),
  };

  if (field.notNull) yamlField.nullable = false;
  if (field.primary) yamlField.primary_key = true;
  if (field.unique) yamlField.unique = true;
  if (field.increment) yamlField.auto_increment = true;
  if (field.default !== "") yamlField.default = field.default;
  if (field.check) yamlField.check = field.check;
  if (field.comment) yamlField.comment = field.comment;
  if (field.size !== undefined && field.size !== "") yamlField.size = field.size;
  if (Array.isArray(field.values) && field.values.length > 0)
    yamlField.values = field.values;

  return yamlField;
}

export function runtimeToCanonicalModel({
  title,
  database,
  knownSubjectAreas,
  tables,
  relationships,
}) {
  const usedTableKeys = new Set();
  const tableKeyById = new Map();
  const fieldKeyByTableId = new Map();
  const yamlTables = {};

  for (const table of tables) {
    const tableKey = makeUniqueKey(table.name, `table_${table.id}`, usedTableKeys);
    tableKeyById.set(table.id, tableKey);

    const usedFieldKeys = new Set();
    const fieldLookup = new Map();
    const yamlColumns = {};

    for (const field of table.fields) {
      const columnKey = makeUniqueKey(
        field.name,
        `column_${field.id}`,
        usedFieldKeys,
      );
      fieldLookup.set(field.id, columnKey);
      yamlColumns[columnKey] = mapFieldToYaml(field);
    }

    fieldKeyByTableId.set(table.id, fieldLookup);

    yamlTables[tableKey] = {
      id: table.id,
      name: table.name,
      ...(table.comment && { description: table.comment }),
      ...(table.subjectArea && { subject_area: table.subjectArea }),
      ...(Array.isArray(table.tags) &&
        table.tags.length > 0 && { tags: table.tags }),
      position: {
        x: table.x,
        y: table.y,
      },
      ...(table.color && { color: table.color }),
      columns: yamlColumns,
    };
  }

  const yamlRelationships = relationships
    .map((relationship) => {
      const fromTable = tableKeyById.get(relationship.startTableId);
      const toTable = tableKeyById.get(relationship.endTableId);
      const fromColumn = fieldKeyByTableId
        .get(relationship.startTableId)
        ?.get(relationship.startFieldId);
      const toColumn = fieldKeyByTableId
        .get(relationship.endTableId)
        ?.get(relationship.endFieldId);

      if (!fromTable || !toTable || !fromColumn || !toColumn) {
        return null;
      }

      return {
        id: relationship.id,
        from_table: fromTable,
        from_column: fromColumn,
        to_table: toTable,
        to_column: toColumn,
        relationship_type: relationship.cardinality ?? Cardinality.MANY_TO_ONE,
        ...(relationship.name && { name: relationship.name }),
        ...(relationship.updateConstraint && {
          update_constraint: relationship.updateConstraint,
        }),
        ...(relationship.deleteConstraint && {
          delete_constraint: relationship.deleteConstraint,
        }),
      };
    })
    .filter(Boolean);

  return {
    version: 1,
    model: {
      id: slugify(title, "drawdb_model"),
      name: title || "Untitled Diagram",
      database: database || DB.GENERIC,
    },
    subject_areas: knownSubjectAreas,
    tables: yamlTables,
    relationships: yamlRelationships,
  };
}

function mapYamlFieldToRuntime(field) {
  return {
    id: field.id,
    name: field.name,
    type: `${field.type ?? ""}`.toUpperCase(),
    default: field.default ?? "",
    check: field.check ?? "",
    primary: !!field.primary_key,
    unique: !!field.unique,
    notNull: field.nullable === undefined ? false : !field.nullable,
    increment: !!field.auto_increment,
    comment: field.comment ?? "",
    ...(field.size !== undefined && { size: field.size }),
    ...(field.values && { values: field.values }),
  };
}

export function canonicalModelToRuntime(model) {
  const tableIdByKey = new Map();
  const fieldIdByTableAndKey = new Map();

  const tables = Object.entries(model.tables).map(([tableKey, table]) => {
    tableIdByKey.set(tableKey, table.id);

    const fieldLookup = new Map();
    const fields = Object.entries(table.columns).map(([columnKey, column]) => {
      fieldLookup.set(columnKey, column.id);
      return mapYamlFieldToRuntime(column);
    });
    fieldIdByTableAndKey.set(tableKey, fieldLookup);

    return normalizeTableMetadata({
      id: table.id,
      name: table.name,
      x: table.position.x,
      y: table.position.y,
      locked: false,
      hidden: false,
      fields,
      comment: table.description ?? "",
      indices: [],
      color: table.color ?? defaultBlue,
      subjectArea: normalizeSubjectArea(table.subject_area),
      tags: table.tags ?? [],
    });
  });

  const relationships = (model.relationships ?? []).map((relationship) => ({
    id: relationship.id,
    startTableId: tableIdByKey.get(relationship.from_table),
    startFieldId: fieldIdByTableAndKey
      .get(relationship.from_table)
      ?.get(relationship.from_column),
    endTableId: tableIdByKey.get(relationship.to_table),
    endFieldId: fieldIdByTableAndKey
      .get(relationship.to_table)
      ?.get(relationship.to_column),
    name:
      relationship.name ||
      `${relationship.from_table}_${relationship.from_column}_fk`,
    cardinality: relationship.relationship_type ?? Cardinality.MANY_TO_ONE,
    updateConstraint: relationship.update_constraint ?? Constraint.NONE,
    deleteConstraint: relationship.delete_constraint ?? Constraint.NONE,
  }));

  return {
    title: model.model.name,
    database: model.model.database || DB.GENERIC,
    tables,
    relationships,
    notes: [],
    subjectAreas: [],
    modelSubjectAreas: model.subject_areas ?? [],
  };
}
