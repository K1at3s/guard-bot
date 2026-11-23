import config from "../Base/config.js";
import Guild from "../Database/schemas/Guild.js";
import { EmbedBuilder, Colors } from "discord.js";
import { DANGEROUS_PERMISSIONS } from "./security.js";
import { WindowCounter } from "./rateLimit.js";
import Quarantine from "../Database/schemas/Quarantine.js";
import { redactSecrets } from "./secrets.js";

export const FRESH_MS = 10000; // audit kaydı en fazla 10 sn eski olabilir

// Sistem kayıtları: key -> görünen ad + görevli bot + varsayılan ceza
export const GUARDS = {
  ban: { name: "Ban Koruma", roles: ["guard1"], punish: "quarantine", limit: "ban" },
  kick: { name: "Kick Koruma", roles: ["guard1"], punish: "quarantine", limit: "kick" },
  bot: { name: "Bot Koruma", roles: ["guard1"], punish: "quarantine" },
  raid: { name: "Raid Koruma", roles: ["guard1"], punish: "quarantine" },
  channel: { name: "Kanal Koruma", roles: ["guard2"], punish: "quarantine" },
  role: { name: "Rol Koruma", roles: ["guard2"], punish: "quarantine" },
  emoji: { name: "Emoji Koruma", roles: ["guard2"], punish: "quarantine" },
  sticker: { name: "Sticker Koruma", roles: ["guard2"], punish: "quarantine" },
  webhook: { name: "Webhook Koruma", roles: ["guard3"], punish: "quarantine" },
  server: { name: "Sunucu Koruma", roles: ["guard3"], punish: "quarantine" },
  message: { name: "Mesaj Koruma", roles: ["guard3"], punish: "quarantine" },
  tag: { name: "Tag Rol", roles: ["guard3"], punish: "quarantine" },
  timeout: { name: "Timeout Koruma", roles: ["guard1"], punish: "quarantine" },
};

export async function settings(guildId, { includeWarnings = false } = {}) {
  let s = await Guild.findOne({ guildId }, includeWarnings ? undefined : { warns: 0 });
  if (!s) s = new Guild({ guildId });
  return s;
}

// Muafiyet: sahip + safeliste + botun kendisi. Adminler MUAF DEĞİL (guard'ın anlamı bu).
export function isExempt(guild, userId, data) {
  if (!userId) return false;
  if (userId === guild.ownerId) return true;
  if (userId === guild.client.user.id) return true;
  if (config.owners.includes(userId)) return true;
  if (data?.safelist?.includes(userId)) return true;
  if (activeGuardBotIds(data).includes(userId)) return true;
  return false;
}

export function activeGuardBotIds(data, now = Date.now()) {
  const services = data?.services?.values ? [...data.services.values()] : Object.values(data?.services ?? {});
  return [...new Set(services.filter((service) => {
    const age = now - new Date(service.lastSeen).getTime();
    return age >= 0 && age <= 150000 && data?.guardBots?.includes(service.userId);
  }).map((service) => service.userId))];
}

// Audit: hedefe ait TAZE kaydı bul
export async function auditEntry(guild, type, targetId, limit = 3, predicate = () => true) {
  for (const delay of [0, 350, 700]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const logs = await guild.fetchAuditLogs({ type, limit: Math.max(limit, 10) }).catch((err) => {
      guild.client.logger.error(`[Audit] ${type}: ${err.message}`);
      return null;
    });
    if (!logs) return null;
    const now = Date.now();
    const entry = [...logs.entries.values()].find((e) =>
      (!targetId || e.target?.id === targetId || e.targetId === targetId || e.target?.code === targetId || e.target === targetId)
      && now >= e.createdTimestamp && now - e.createdTimestamp < FRESH_MS && predicate(e));
    if (entry) return entry;
  }
  return null;
}

// Aynı kayıt birden fazla gateway sinyali üretse de yalnız bir kez işlenir.
const claimedAudits = new Map();
export function claimAudit(guildId, entry, scope = "guard") {
  if (!entry?.id) return true;
  const now = Date.now();
  for (const [key, expires] of claimedAudits) if (expires <= now) claimedAudits.delete(key);
  const key = `${guildId}:${scope}:${entry.id}`;
  if (claimedAudits.has(key)) return false;
  claimedAudits.set(key, now + 60000);
  return true;
}

export async function attempt(guild, label, operation) {
  try { await operation(); return "Başarılı"; }
  catch (err) { guild.client.logger.error(`[${label}] ${err.message}`); return `Başarısız (${err.code || "API hatası"})`; }
}

// Ceza merdiveni: quarantine (rolleri al + karantina rolü) | kick | ban
// BAŞARI DOĞRULAMALI — hiyerarşi yetmezse "hata" döner, loglar yalan söylemez.
export async function punish(guild, executorId, mode, reason) {
  const log = guild.client.logger;
  try {
    const data = await settings(guild.id);
    if (isExempt(guild, executorId, data)) return "muaf";
    const member = await guild.members.fetch({ user: executorId, force: true }).catch(() => null);
    if (!member) return "yok";
    if (member.id === guild.ownerId) return "muaf";
    if (mode === "ban") {
      if (!member.bannable) return "hata";
      await member.ban({ reason });
      const banned = await guild.bans.fetch(executorId).then(() => true).catch(() => false);
      if (!banned) { log.error(`[Ceza] ban doğrulanamadı: ${member.user.tag}`); return "hata"; }
      log.warn(`[Ceza] ${member.user.tag} BANLANDI (${reason})`);
      return "ban";
    }
    if (mode === "kick") {
      if (!member.kickable) return "hata";
      await member.kick(reason);
      log.warn(`[Ceza] ${member.user.tag} ATILDI (${reason})`);
      return "kick";
    }
    if (mode !== "quarantine" || !member.manageable) return "hata";
    const quarantine = data.quarantineRole ? guild.roles.cache.get(data.quarantineRole) : null;
    if (data.quarantineRole && (!quarantine?.editable || quarantine.id === guild.id || quarantine.id === data.tagRole || quarantine.managed || quarantine.permissions.bitfield !== 0n)) return "hata";
    if (quarantine && [...guild.channels.cache.values()].some((channel) => channel.permissionOverwrites?.cache.get(quarantine.id)?.allow.any(DANGEROUS_PERMISSIONS))) return "hata";
    await Quarantine.updateOne({ _id: `${guild.id}:${executorId}` }, { $set: { guildId: guild.id, userId: executorId, reason } }, { upsert: true });
    const retained = [...member.roles.cache.values()].filter((r) => r.managed).map((r) => r.id);
    if (quarantine) retained.push(quarantine.id);
    await member.roles.set(retained, reason);
    const fresh = await guild.members.fetch({ user: executorId, force: true });
    if (fresh.roles.cache.some((r) => r.id !== guild.id && !r.managed && r.id !== quarantine?.id)
      || (quarantine && !fresh.roles.cache.has(quarantine.id)) || fresh.permissions?.any(DANGEROUS_PERMISSIONS)) {
      log.error(`[Ceza] rol alma doğrulanamadı: ${member.user.tag} (bot rolü üstte olmalı)`);
      return "hata";
    }
    log.warn(`[Ceza] ${member.user.tag} yetki rolleri alındı${quarantine ? ", karantina rolü verildi" : "; karantina rolü ayarlanmamış"} (${reason})`);
    return "quarantine";
  } catch (err) {
    log.error(`[Ceza] başarısız ${executorId}: ${err.message}`);
    return "hata";
  }
}

export async function sendLog(guild, key, embed) {
  const data = await Guild.findOne({ guildId: guild.id }, { logs: 1 }).catch((err) => {
    guild.client.logger.error(`[Guard log ayarları] ${err.message}`);
    return null;
  });
  const id = data?.logs?.[key];
  if (!id) return;
  const ch = guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(() => null);
  if (guild.roles.everyone && ch?.permissionsFor?.(guild.roles.everyone)?.has("ViewChannel")) {
    guild.client.logger.error(`[Guard log] ${key}: herkese açık kanala hassas kayıt gönderilmedi.`);
    return;
  }
  if (ch?.isTextBased()) await ch.send({ embeds: [new EmbedBuilder(redactSecrets(embed.toJSON()))], allowedMentions: { parse: [] } })
    .catch((err) => guild.client.logger.error(`[Guard log] ${key}: ${err.message}`));
}

// Muaf işlemi de logla: kim, ne yaptı, neden işlem yok
export async function logExempt(guild, key, actorTag, action) {
  await sendLog(guild, key, new EmbedBuilder().setColor(Colors.Grey)
    .setTitle("🛡️ Guard Kaydı (Muaf)")
    .setDescription(`**${actorTag}** ${action} — muaf olduğu için işlem yapılmadı.`)
    .setTimestamp());
}

// Limit sayacı (ban/kick/katılım): pencere içinde limiti aştı mı?
const buckets = new WindowCounter();
export function hit(key, windowMs) {
  return buckets.hit(key, windowMs);
}

// Raid modu durumu (raidGuard + panik komutu ortak kullanır)
export const raidMode = {
  active: async (guildId) => Boolean(await Guild.exists({ guildId, raidUntil: { $gt: new Date() } })),
  on: (guildId, ms) => Guild.updateOne({ guildId }, { $set: { raidUntil: new Date(Date.now() + ms) } }, { upsert: true }),
  off: (guildId) => Guild.updateOne({ guildId }, { $set: { raidUntil: null } }),
};
