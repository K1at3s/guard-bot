import { UserInputError } from "./errors.js";
import { Colors, EmbedBuilder } from "discord.js";
import config from "../Base/config.js";
import Case from "../Database/schemas/Case.js";
import { sendLog } from "./guard.js";
import { redactSecrets } from "./secrets.js";

export function snowflake(raw) {
  const value = String(raw ?? "");
  if (!/^(?:\d{17,20}|<@!?\d{17,20}>|<@&\d{17,20}>|<#\d{17,20}>)$/.test(value)) return null;
  return value.match(/\d+/)[0];
}

export function duration(raw, max = 28 * 86400000) {
  const value = String(raw ?? "").toLowerCase();
  if (/^\d+$/.test(value)) {
    const ms = Number(value) * 60000;
    return ms > 0 && ms <= max ? ms : null;
  }
  if (!/^(?:\d+[smhd])+$/.test(value)) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = [...value.matchAll(/(\d+)([smhd])/g)].reduce((total, [, n, unit]) => total + Number(n) * units[unit], 0);
  return Number.isSafeInteger(ms) && ms > 0 && ms <= max ? ms : null;
}

export async function resolveMember(guild, raw) {
  const id = snowflake(raw);
  if (!id) return null;
  return guild.members.fetch({ user: id, force: true }).catch((err) => {
    if (err.code === 10007) return null;
    throw err;
  });
}

export function assertTarget(message, member, capability) {
  if (!member) throw new UserInputError("Üye bulunamadı. Geçerli bir üye etiketi veya ID girin.");
  if ([message.author.id, message.client.user.id, message.guild.ownerId].includes(member.id)) {
    throw new UserInputError("Kendinize, sunucu sahibine veya bu bota işlem yapamazsınız.");
  }
  if (message.author.id !== message.guild.ownerId && message.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
    throw new UserInputError("Hedefin en yüksek rolü sizin rolünüzle aynı veya daha üstte.");
  }
  if (capability && !member[capability]) throw new UserInputError("Botun yetkisi veya rol sırası bu işlem için yeterli değil.");
}

export const reasonText = (args, fallback = "Sebep belirtilmedi") => redactSecrets(args.join(" ").trim() || fallback).slice(0, 400);
export const auditReason = (message, reason) => `${reason} | ${message.author.id}`.slice(0, 512);

export async function recordCase(message, action, targetId, reason, details = {}) {
  reason = redactSecrets(reason);
  details = redactSecrets(details);
  const targetName = message.guild?.members?.cache?.get(targetId)?.user?.tag
    ?? message.client?.users?.cache?.get(targetId)?.tag
    ?? null;
  const embed = new EmbedBuilder().setColor(Colors.Blurple).setTitle(`Moderasyon • ${action}`)
    .addFields({ name: "Hedef", value: targetName ? `${targetName} (\`${targetId}\`)` : `<@${targetId}> (\`${targetId}\`)`, inline: true },
      { name: "Yetkili", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
      { name: "Sebep", value: reason.slice(0, 1024) }).setTimestamp();
  let saved;
  try {
    saved = await Case.create({ guildId: message.guild.id, action, targetId, moderatorId: message.author.id, reason, details });
    embed.setFooter({ text: `İşlem kaydı: ${saved.id}` });
  } catch (err) {
    message.client.logger.error(`[İşlem kaydı] ${err.message}`);
  }
  await sendLog(message.guild, "mod", embed);
  return saved?.id ?? "kayıt oluşturulamadı";
}

export async function report(message, title, fields, color = Colors.Blurple) {
  return message.channel.send({ allowedMentions: { parse: [] }, embeds: [new EmbedBuilder().setColor(color).setTitle(redactSecrets(title))
    .addFields(fields.map(([name, value]) => ({ name, value: redactSecrets(String(value ?? "—")).slice(0, 1024) || "—" })))
    .setFooter({ text: `${message.author.tag} • ${config.prefix}yardım` }).setTimestamp()] });
}

export function paginate(items, rawPage = "1", pageSize = 10) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Number(rawPage);
  if (!Number.isInteger(page) || page < 1 || page > pages) throw new UserInputError(`Sayfa 1–${pages} arasında olmalı.`);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pages, total: items.length };
}
