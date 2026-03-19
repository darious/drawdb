import { createContext, useCallback, useMemo, useState } from "react";
import { deriveKnownSubjectAreas } from "../utils/tableMetadata";

export const MetadataContext = createContext(null);

export default function MetadataContextProvider({ children, tables }) {
  const [importedSubjectAreas, setImportedSubjectAreas] = useState([]);
  const [filters, setFilters] = useState({
    selectedSubjectArea: "All",
    selectedTags: [],
  });

  const knownSubjectAreas = useMemo(
    () => deriveKnownSubjectAreas(tables, importedSubjectAreas),
    [tables, importedSubjectAreas],
  );

  const clearFilters = useCallback(
    () =>
      setFilters({
        selectedSubjectArea: "All",
        selectedTags: [],
      }),
    [],
  );

  return (
    <MetadataContext.Provider
      value={{
        importedSubjectAreas,
        setImportedSubjectAreas,
        knownSubjectAreas,
        filters,
        setFilters,
        clearFilters,
      }}
    >
      {children}
    </MetadataContext.Provider>
  );
}
