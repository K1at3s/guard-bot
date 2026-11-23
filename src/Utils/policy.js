import { UserInputError } from "./errors.js";
export const MESSAGE_OPTIONS = {
  invites: { type: "boolean" }, scam: { type: "boolean" },
  mentions: { min: 1, max: 50 }, flood: { min: 2, max: 30 },
  floodWindowMs: { min: 1000, max: 60000 }, duplicates: { min: 2, max: 20 },
  emojis: { min: 2, max: 100 }, capsPercent: { min: 10, max: 100 },
  capsMinLength: { min: 5, max: 100 }, timeoutMs: { min: 1000, max: 2419200000 },
};
export const RAID_OPTIONS = {
  windowMs: { min: 1000, max: 60000 }, durationMs: { min: 60000, max: 3600000 },
  minAccountAgeHours: { min: 0, max: 720 },
};
export function policyValue(options, key, raw) {
  const rule = Object.hasOwn(options, key) ? options[key] : null;
  if (!rule) throw new UserInputError(`Geçerli ayarlar: ${Object.keys(options).join(", ")}`);
  if (rule.type === "boolean") {
    if (!["aç", "kapat", "true", "false"].includes(raw)) throw new UserInputError("Değer aç veya kapat olmalı.");
    return raw === "aç" || raw === "true";
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < rule.min || value > rule.max) throw new UserInputError(`${key}: ${rule.min}–${rule.max} arasında tam sayı girin.`);
  return value;
}
export const PROFILES = {
  dengeli: { limits: { ban: 3, kick: 3, joins: 5, timeout: 4 }, messagePolicy: { flood: 5, mentions: 5, duplicates: 3 } },
  sıkı: { limits: { ban: 1, kick: 1, joins: 3, timeout: 2 }, messagePolicy: { flood: 3, mentions: 3, duplicates: 2 } },
};
