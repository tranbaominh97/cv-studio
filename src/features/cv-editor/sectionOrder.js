// Presentation order only: keep the saved CV and its section contents unchanged.
export function orderedSections(sections) {
  const entries = Object.entries(sections);
  const isCore = ([name]) => /^CORE COMPETENC(?:Y|IES)$/i.test(name.trim());
  const core = entries.filter(isCore);
  if (!core.length) return entries;

  const rest = entries.filter(entry => !isCore(entry));
  const education = rest.findIndex(([name]) => name.trim().toUpperCase() === 'EDUCATION');
  const languages = rest.findIndex(([name]) => /^LANGUAGES?(?:\s*&\s*TOOLS?)?$/i.test(name.trim()));
  const position = education >= 0 ? education + 1 : languages >= 0 ? languages : rest.length;
  rest.splice(position, 0, ...core);
  return rest;
}
