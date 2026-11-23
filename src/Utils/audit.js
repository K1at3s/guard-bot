// Güncelleme sinyalini yalnız aynı eski/yeni değerleri taşıyan audit kaydıyla eşleştir.
const valueOf = (value) => value?.bitfield !== undefined ? String(value.bitfield)
  : Array.isArray(value) ? JSON.stringify(value.map((item) => String(item?.id ?? item)).sort())
  : value === undefined || value === null ? null : String(value);

export function matchesChanges(entry, before, after, keys) {
  let matched = 0;
  for (const change of entry.changes ?? []) {
    const property = keys[change.key];
    if (!Object.hasOwn(keys, change.key) || !property || valueOf(before[property]) === valueOf(after[property])) continue;
    if (valueOf(change.old) !== valueOf(before[property]) || valueOf(change.new) !== valueOf(after[property])) return false;
    matched++;
  }
  return matched > 0;
}

export function freshAudit(entry, now = Date.now(), windowMs = 10000) {
  const age = now - entry?.createdTimestamp;
  return Number.isFinite(age) && age >= 0 && age < windowMs;
}
