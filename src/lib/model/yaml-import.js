import { load } from "js-yaml";
import { canonicalModelToRuntime } from "./model-mapper";
import { validateCanonicalModel } from "./validation";

export function importDiagramFromYaml(source) {
  let parsed;

  try {
    parsed = load(source);
  } catch (error) {
    return {
      ok: false,
      message: error.message || "The YAML file could not be parsed.",
    };
  }

  const validation = validateCanonicalModel(parsed);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    value: canonicalModelToRuntime(validation.value),
  };
}
