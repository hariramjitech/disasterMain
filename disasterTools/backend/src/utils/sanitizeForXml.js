function sanitizeForXml(text) {
  if (!text) return "none";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\n/g, " ");
}
module.exports = sanitizeForXml;