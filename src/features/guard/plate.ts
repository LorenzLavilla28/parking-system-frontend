export function normalizePlateInput(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\-\s]/g, '')
    .replace(/[-\s]+/g, ' ')
    .trimStart();
}

export function normalizePlateForSubmit(value: string) {
  return normalizePlateInput(value).trim();
}
