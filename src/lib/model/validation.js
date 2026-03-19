import { Cardinality, DB } from "../../data/constants";
import { normalizeSubjectArea, normalizeTags } from "../../utils/tableMetadata";

const validDatabases = new Set(Object.values(DB));
const validRelationshipTypes = new Set(Object.values(Cardinality));

function fail(message) {
  return { ok: false, message };
}

export function validateCanonicalModel(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("YAML must contain an object at the root.");
  }

  if (input.version !== 1) {
    return fail("Only YAML version 1 is supported.");
  }

  if (!input.model || typeof input.model !== "object" || Array.isArray(input.model)) {
    return fail("The YAML file is missing the required model block.");
  }

  if (!input.model.id || !input.model.name) {
    return fail("model.id and model.name are required.");
  }

  if (
    input.model.database !== undefined &&
    !validDatabases.has(input.model.database)
  ) {
    return fail(`Unsupported database '${input.model.database}'.`);
  }

  if (
    input.subject_areas !== undefined &&
    !Array.isArray(input.subject_areas)
  ) {
    return fail("subject_areas must be a list of strings.");
  }

  const subjectAreas = [
    ...new Set((input.subject_areas ?? []).map(normalizeSubjectArea).filter(Boolean)),
  ];

  if (!input.tables || typeof input.tables !== "object" || Array.isArray(input.tables)) {
    return fail("tables must be a mapping of table keys to table definitions.");
  }

  const tableEntries = Object.entries(input.tables);
  if (tableEntries.length === 0) {
    return fail("At least one table is required.");
  }

  const tableKeys = new Set(tableEntries.map(([tableKey]) => tableKey));

  for (const [tableKey, table] of tableEntries) {
    if (!table.id || !table.name) {
      return fail(`Table '${tableKey}' is missing id or name.`);
    }

    if (!table.position || typeof table.position !== "object") {
      return fail(`Table '${tableKey}' is missing position.`);
    }

    if (
      typeof table.position.x !== "number" ||
      typeof table.position.y !== "number"
    ) {
      return fail(`Table '${tableKey}' position must contain numeric x and y values.`);
    }

    if (!table.columns || typeof table.columns !== "object" || Array.isArray(table.columns)) {
      return fail(`Table '${tableKey}' is missing columns.`);
    }

    if (
      table.subject_area !== undefined &&
      typeof table.subject_area !== "string"
    ) {
      return fail(`Table '${tableKey}' subject_area must be a string.`);
    }

    if (table.tags !== undefined && !Array.isArray(table.tags)) {
      return fail(`Table '${tableKey}' tags must be a list of strings.`);
    }

    if (table.tags && table.tags.some((tag) => typeof tag !== "string")) {
      return fail(`Table '${tableKey}' tags must only contain strings.`);
    }

    const normalizedSubjectArea = normalizeSubjectArea(table.subject_area);
    if (normalizedSubjectArea && !subjectAreas.includes(normalizedSubjectArea)) {
      subjectAreas.push(normalizedSubjectArea);
    }

    const columnEntries = Object.entries(table.columns);
    if (columnEntries.length === 0) {
      return fail(`Table '${tableKey}' must contain at least one column.`);
    }

    for (const [columnKey, column] of columnEntries) {
      if (!column.id || !column.name || !column.type) {
        return fail(
          `Column '${columnKey}' in table '${tableKey}' is missing id, name, or type.`,
        );
      }
    }
  }

  if (input.relationships !== undefined && !Array.isArray(input.relationships)) {
    return fail("relationships must be a list.");
  }

  const relationshipIds = new Set();

  for (const relationship of input.relationships ?? []) {
    if (
      !relationship.id ||
      !relationship.from_table ||
      !relationship.from_column ||
      !relationship.to_table ||
      !relationship.to_column
    ) {
      return fail(
        "Each relationship must contain id, from_table, from_column, to_table, and to_column.",
      );
    }

    if (relationshipIds.has(relationship.id)) {
      return fail(`Duplicate relationship id '${relationship.id}'.`);
    }
    relationshipIds.add(relationship.id);

    if (!tableKeys.has(relationship.from_table) || !tableKeys.has(relationship.to_table)) {
      return fail(`Relationship '${relationship.id}' references a table that does not exist.`);
    }

    if (
      !input.tables[relationship.from_table].columns[relationship.from_column] ||
      !input.tables[relationship.to_table].columns[relationship.to_column]
    ) {
      return fail(`Relationship '${relationship.id}' references a column that does not exist.`);
    }

    if (
      relationship.relationship_type !== undefined &&
      !validRelationshipTypes.has(relationship.relationship_type)
    ) {
      return fail(`Relationship '${relationship.id}' uses an unsupported relationship_type.`);
    }
  }

  return {
    ok: true,
    value: {
      ...input,
      subject_areas: subjectAreas,
      tables: Object.fromEntries(
        tableEntries.map(([tableKey, table]) => [
          tableKey,
          {
            ...table,
            subject_area: normalizeSubjectArea(table.subject_area),
            tags: normalizeTags(table.tags ?? []),
            columns: Object.fromEntries(
              Object.entries(table.columns).map(([columnKey, column]) => [
                columnKey,
                {
                  ...column,
                  nullable:
                    column.nullable === undefined ? true : !!column.nullable,
                  primary_key: !!column.primary_key,
                },
              ]),
            ),
          },
        ]),
      ),
      relationships: (input.relationships ?? []).map((relationship) => ({
        ...relationship,
        relationship_type:
          relationship.relationship_type ?? Cardinality.MANY_TO_ONE,
      })),
    },
  };
}
