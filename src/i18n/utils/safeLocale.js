export function getSafeLocale(locale) {
  return `${locale ?? "en"}`
    .split("@")[0]
    .replace("_", "-");
}
