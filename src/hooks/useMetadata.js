import { useContext } from "react";
import { MetadataContext } from "../context/MetadataContext";

export default function useMetadata() {
  return useContext(MetadataContext);
}

