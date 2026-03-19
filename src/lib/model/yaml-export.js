import { dump } from "js-yaml";
import { runtimeToCanonicalModel } from "./model-mapper";

export function exportDiagramAsYaml(diagram) {
  return dump(runtimeToCanonicalModel(diagram), {
    indent: 2,
    lineWidth: 0,
    sortKeys: true,
  });
}
