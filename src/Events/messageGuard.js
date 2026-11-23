import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, isExempt, sendLog, hit, auditEntry, punish, logExempt, claimAudit, attempt } from "../Utils/guard.js";
import { createHash } from "node:crypto";
const TOKEN_RE = /[\w-]{20,}\.[\w-]{6,}\.[\w-]{25,}/;
const INVITE_RE = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[^\s]+/i;
const SCAM_RE = /(free-?nitro|nitro-?free|steamcommunity.*gift|discord-?gift|airdrop.*claim)/i;
const EMOJI_RE = /<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const recent = new Map();
const moderationCooldown = new Map();
export function inspectContent(message, policy = {}) {
  const content = message.content ?? "";
  if (TOKEN_RE.test(content)) return "Token sızıntısı";
  if (message.mentions.everyone || message.mentions.users.size + message.mentions.roles.size >= (policy.mentions ?? 5)) return "Toplu mention";
  if ((policy.invites ?? true) && INVITE_RE.test(content)) return "Davet bağlantısı";
  if ((policy.scam ?? true) && SCAM_RE.test(content)) return "Şüpheli bağlantı";
  const letters = content.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ]/g, "");
  if (letters.length >= (policy.capsMinLength ?? 10) && letters.replace(/[^A-ZĞÜŞÖÇİ]/g, "").length / letters.length * 100 > (policy.capsPercent ?? 70)) return "Büyük harf spamı";
  if ((content.match(EMOJI_RE) ?? []).length >= (policy.emojis ?? 10)) return "Emoji spamı";
  return null;
}
export default {
  name: [Events.MessageCreate, Events.MessageUpdate, Events.MessageBulkDelete], roles: ["guard3"],
  async execute(a, b) {
    if (a instanceof Map) {
      const first = a.first?.() ?? [...a.values()][0];
      const guild = first?.guild ?? b?.guild;
      if (!guild) return;
      const data = await settings(guild.id);
      if (!data.guards.message.enabled) return;
      const entry = await auditEntry(guild, AuditLogEvent.MessageBulkDelete, (b ?? first?.channel)?.id);
      if (!entry?.executor || !claimAudit(guild.id, entry, "bulk-delete")) return;
      if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "message", entry.executor.tag, "toplu mesaj sildi");
      const result = await punish(guild, entry.executor.id, data.guards.message.punish, "İzinsiz toplu mesaj silme");
      return sendLog(guild, "message", new EmbedBuilder().setColor(Colors.Red).setTitle("Toplu Mesaj Silme")
        .setDescription(entry.executor.tag + " • " + a.size + " mesaj. Mesaj içeriği geri getirilemez.").addFields({ name: "Ceza", value: result }).setTimestamp());
    }
    let message = b ?? a;
    if (!message.guild || message.author?.id === message.guild.client.user.id) return;
    if (message.partial) { try { message = await message.fetch(); } catch { return; } }
    if (b && a.content === b.content) return;
    const guild = message.guild;
    const data = await settings(guild.id);
    if (!data.guards.message.enabled) return;
    const policy = data.messagePolicy ?? {};
    let violation = inspectContent(message, policy);
    const secret = violation === "Token sızıntısı";
    if (!secret && (isExempt(guild, message.author.id, data) || policy.ignoredChannels?.includes(message.channel.id) || policy.ignoredChannels?.includes(message.channel.parentId))) return;
    const key = guild.id + ":" + message.author.id;
    const now = Date.now();
    const flood = !b && hit(key + ":flood", policy.floodWindowMs ?? 5000) >= (policy.flood ?? 5);
    if (flood && !secret) violation = "Flood";
    if (!b && !secret) {
      if (recent.size >= 20000) for (const [id, value] of recent) if (now - value.at > 10000) recent.delete(id);
      const record = recent.get(key);
      const buffer = (record?.items ?? []).filter((m) => now - m.at < 10000);
      const normalized = (message.content ?? "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
      const fingerprint = createHash("sha256").update(normalized).digest("hex");
      buffer.push({ content: fingerprint, at: now });
      if (recent.size < 20000 || recent.has(key)) recent.set(key, { at: now, items: buffer.slice(-30) });
      if (normalized.length > 5 && buffer.filter((m) => m.content === fingerprint).length >= (policy.duplicates ?? 3)) violation ||= "Tekrar spamı";
    }
    if (!violation) return;
    const deletion = await attempt(guild, "Mesaj silme", () => message.delete());
    let result = "Susturma uygulanmadı";
    if ((flood || ["Toplu mention", "Flood", "Tekrar spamı"].includes(violation)) && !isExempt(guild, message.author.id, data)) {
      if (moderationCooldown.size > 20000) for (const [id, until] of moderationCooldown) if (until <= now) moderationCooldown.delete(id);
      if ((moderationCooldown.get(key) ?? 0) > now) return;
      moderationCooldown.set(key, now + 10000);
      if (message.webhookId) result = "Webhook mesajı; üye susturması uygulanamaz";
      else {
        const member = message.member ?? await guild.members.fetch(message.author.id);
        if (member.user.bot) result = await punish(guild, member.id, data.guards.message.punish, "Bot mesaj spamı");
        else result = member.moderatable ? await attempt(guild, "Mesaj susturma", () => member.timeout(policy.timeoutMs ?? 600000, "Guard: " + violation)) : "Başarısız: üye susturulamaz";
      }
    }
    return sendLog(guild, "message", new EmbedBuilder().setColor(Colors.Red).setTitle("Mesaj Koruma • " + violation)
      .setDescription(message.author.tag + " • " + message.channel.id + (b ? " • Düzenlenen mesaj" : ""))
      .addFields({ name: "Mesaj silme", value: deletion }, { name: "Susturma", value: result }).setTimestamp());
  },
};
