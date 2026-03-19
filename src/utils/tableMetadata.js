export function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : `${value ?? ""}`.split(",");

  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

export function normalizeSubjectArea(value) {
  const normalizedValue = `${value ?? ""}`.trim();
  return normalizedValue === "" ? "" : normalizedValue;
}

export function normalizeTableMetadata(table) {
  return {
    ...table,
    comment: table.comment ?? "",
    tags: normalizeTags(table.tags),
    subjectArea: normalizeSubjectArea(table.subjectArea),
  };
}

export function normalizeTablesMetadata(tables = []) {
  return tables.map(normalizeTableMetadata);
}

export function deriveKnownSubjectAreas(tables = [], importedSubjectAreas = []) {
  return [...new Set([
    ...importedSubjectAreas.map(normalizeSubjectArea),
    ...tables.map((table) => normalizeSubjectArea(table.subjectArea)),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function deriveKnownTags(tables = []) {
  return [...new Set(tables.flatMap((table) => normalizeTags(table.tags)))].sort(
    (a, b) => a.localeCompare(b),
  );
}

export function matchesMetadataFilters(table, filters) {
  const normalizedSubjectArea = normalizeSubjectArea(table.subjectArea);
  const normalizedTags = normalizeTags(table.tags);
  const normalizedSelectedTags = normalizeTags(filters.selectedTags);

  const matchesSubjectArea =
    filters.selectedSubjectArea === "All" ||
    normalizedSubjectArea === filters.selectedSubjectArea;

  const matchesTags =
    normalizedSelectedTags.length === 0 ||
    normalizedSelectedTags.some((tag) => normalizedTags.includes(tag));

  return matchesSubjectArea && matchesTags;
}

