const TR = {
  "error.generic": "❌ İşlem tamamlanamadı; hata kaydını kontrol edin.",
  "error.db": "❌ Veritabanına işlem kaydedilemedi.",
  "error.discord": "❌ Discord erişimi reddetti veya hedef bulunamadı. Botun yetkilerini ve rol sırasını kontrol edin.",
  "error.no_permission": "❌ Bu komut için yetkiniz yok. Koruma ayarları sahip veya güvenli listedeki yetkililere açıktır.",
  "error.no_channel": "❌ Bu kanalda komut kullanılamaz.",
  "error.cooldown": "⏳ Komut bekleme süresinde.",
  "error.member_missing": "❌ Üye bilgisi alınamadı (sunucudan ayrılmış olabilir).",
  "error.guild_only": "❌ Bu komut sadece sunucuda kullanılabilir.",
  "error.not_found": "❌ Komut bulunamadı.",
  "error.bot_perms": "❌ Botun eksik yetkileri: {perms}",
  "ban.done": "Ban uygulandı",
  "ban.user": "Kullanıcı",
  "ban.member": "Üye",
  "ban.reason": "Sebep",
  "ban.delete": "Mesaj silme",
  "ban.record": "Kayıt",
  "ban.days": "{days} gün",
};
const EN = {
  "error.generic": "❌ Action could not be completed; check logs.",
  "error.db": "❌ Database operation could not be saved.",
  "error.discord": "❌ Discord denied access or target was not found. Check bot permissions and role hierarchy.",
  "error.no_permission": "❌ You don't have permission for this command. Guard settings require owner or safelisted trusted authority.",
  "error.no_channel": "❌ Commands cannot be used in this channel.",
  "error.cooldown": "⏳ Command is on cooldown.",
  "error.member_missing": "❌ Member information could not be fetched (they may have left).",
  "error.guild_only": "❌ This command can only be used in a server.",
  "error.not_found": "❌ Command not found.",
  "error.bot_perms": "❌ Missing bot permissions: {perms}",
  "ban.done": "Ban applied",
  "ban.user": "User",
  "ban.member": "Member",
  "ban.reason": "Reason",
  "ban.delete": "Message deletion",
  "ban.record": "Record",
  "ban.days": "{days} day(s)",
};

const DICTS = { tr: TR, en: EN };

export function resolveLocale(input) {
  const raw = typeof input === "string" ? input : input?.locale ?? input?.guildLocale ?? input?.guild?.preferredLocale ?? "tr";
  return String(raw).toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function isTurkish(input) {
  return resolveLocale(input) === "tr";
}

export function t(locale, key, vars = {}) {
  const lang = resolveLocale(locale);
  const dict = DICTS[lang] ?? EN;
  const template = dict[key] ?? TR[key] ?? EN[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function localeFromContext(ctx) {
  return resolveLocale(ctx?.interaction?.locale ?? ctx?.interaction?.guildLocale ?? ctx?.guild?.preferredLocale ?? ctx?.locale);
}
