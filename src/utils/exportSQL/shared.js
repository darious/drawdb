import { isFunction, isKeyword } from "../utils";

import { DB } from "../../data/constants";
import { dbToTypes } from "../../data/datatypes";
import { getRelationshipFieldNames } from "../relationships";

export function parseDefault(field, database = DB.GENERIC) {
  if (
    isFunction(field.default) ||
    isKeyword(field.default) ||
    !dbToTypes[database][field.type].hasQuotes
  ) {
    return field.default;
  }

  return `'${escapeQuotes(field.default)}'`;
}

export function escapeQuotes(str) {
  return str.replace(/[']/g, "'$&");
}

export function exportFieldComment(comment) {
  if (comment === "") {
    return "";
  }

  return comment
    .split("\n")
    .map((commentLine) => `\t-- ${commentLine}\n`)
    .join("");
}

export function getInlineFK(table, obj) {
  let fks = [];
  obj.references.forEach((r) => {
    if (r.startTableId === table.id) {
      const relFields = getRelationshipFieldNames(r, obj.tables);
      if (!relFields) return;

      fks.push(
        `\tFOREIGN KEY (${relFields.pairs
          .map((pair) => `"${pair.startFieldName}"`)
          .join(", ")}) REFERENCES "${relFields.endTable.name}"(${relFields.pairs
          .map((pair) => `"${pair.endFieldName}"`)
          .join(", ")})\n\tON UPDATE ${r.updateConstraint.toUpperCase()} ON DELETE ${r.deleteConstraint.toUpperCase()}`,
      );
    }
  });
  return fks.join(",\n");
}
