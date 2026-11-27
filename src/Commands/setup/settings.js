import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField, EmbedBuilder, Colors } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { GUARDS, settings } from "../../Utils/guard.js";
import { MESSAGE_OPTIONS, RAID_OPTIONS, policyValue } from "../../Utils/policy.js";
import { snowflake, duration, recordCase, report } from "../../Utils/command.js";

const dot = (v) => v ? "🟢" : "🔴";
const ch = (id) => id ? `<#${id}>` : "`—`";
const rl = (id) => id ? `<@&${id}>` : "`—`";
const fmtMs = (ms) => {
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (d) parts.push(`${d}g`);
  if (h) parts.push(`${h}sa`);
  if (m) parts.push(`${m}dk`);
  if (s || !parts.length) parts.push(`${s}sn`);
  return parts.join(" ");
};

export const commandBase = {
  name: "settings",
  aliases: ["ayarlar"],
  description: "Sistem durumunu gösterir.",
  perms: PermissionsBitField.Flags.ManageGuild,
  cooldown: 5,
  async run(client, message, args) {
    const data = await settings(message.guild.id);
    if (args[0]) {
      const [sub, key, raw] = args;
      const set = {};
      if (sub === "log") {
        if (!Object.hasOwn(GUARDS, key) && key !== "mod") throw new UserInputError("Geçerli bir koruma sistemi girin.");
        const channel = message.guild.channels.cache.get(snowflake(raw));
        if (!channel?.isTextBased() || channel.isThread?.()) throw new UserInputError("Geçerli log kanalı seçin.");
        if (channel.permissionsFor(message.guild.roles.everyone)?.has(PermissionsBitField.Flags.ViewChannel)) throw new UserInputError("Log kanalı herkese açık olamaz. Önce @everyone için Kanalı Görüntüle iznini kapatın.");
        set[`logs.${key}`] = channel.id;
      } else if (sub === "mesaj" || sub === "message" || sub === "raid") {
        if ((sub === "mesaj" || sub === "message") && ["hariç-ekle","haric-ekle","exclude-add","hariç-kaldır","haric-kaldir","exclude-remove"].includes(key)) {
          const id = snowflake(raw);
          if (!message.guild.channels.cache.get(id)?.isTextBased()) throw new UserInputError("Geçerli kanal seçin.");
          await Guild.updateOne({ guildId: message.guild.id }, { [["hariç-ekle","haric-ekle","exclude-add"].includes(key) ? "$addToSet" : "$pull"]: { "messagePolicy.ignoredChannels": id } }, { upsert: true });
          return message.reply("✅ Mesaj korumasının kanal istisnası güncellendi. Token sızıntısı kontrolü devam eder.");
        }
        set[`${(sub === "mesaj" || sub === "message") ? "messagePolicy" : "raidPolicy"}.${key}`] = policyValue((sub === "mesaj" || sub === "message") ? MESSAGE_OPTIONS : RAID_OPTIONS, key, raw);
      } else if (sub === "uyarı" || sub === "uyari" || sub === "warning") {
        const threshold = Number(key), ms = duration(raw);
        if (!Number.isInteger(threshold) || threshold < 1 || threshold > 20 || !ms) throw new UserInputError("Kullanım: ayarlar uyarı <1..20> <1m|1h|1d>");
        set["warningPolicy.threshold"] = threshold;
        set["warningPolicy.timeoutMs"] = ms;
      } else if (sub === "politikalar" || sub === "policies") {
        const m = data.messagePolicy?.toObject?.() ?? data.messagePolicy ?? {};
        const r = data.raidPolicy?.toObject?.() ?? data.raidPolicy ?? {};
        const w = data.warningPolicy?.toObject?.() ?? data.warningPolicy ?? {};
        const ignored = (m.ignoredChannels ?? []).map((id) => `<#${id}>`).join(", ") || "`Yok`";
        return report(message, "Koruma politikaları", [
          ["Mesaj", [
            `Davet linkleri: ${m.invites ? "🟢 Açık" : "🔴 Kapalı"}`,
            `Scam linkleri: ${m.scam ? "🟢 Açık" : "🔴 Kapalı"}`,
            `Mention limiti: \`${m.mentions ?? "—"}\``,
            `Flood: \`${m.flood ?? "—"}\` mesaj / \`${fmtMs(m.floodWindowMs ?? 0)}\``,
            `Tekrar: \`${m.duplicates ?? "—"}\``,
            `Emoji limiti: \`${m.emojis ?? "—"}\``,
            `Büyük harf: \`%${m.capsPercent ?? "—"}\` (min ${m.capsMinLength ?? "—"} karakter)`,
            `Mesaj timeout: \`${fmtMs(m.timeoutMs ?? 0)}\``,
            `İstisna kanallar: ${ignored}`,
          ].join("\n")],
          ["Raid", [
            `Katılım penceresi: \`${fmtMs(r.windowMs ?? 0)}\``,
            `Raid süresi: \`${fmtMs(r.durationMs ?? 0)}\``,
            `Min. hesap yaşı: \`${r.minAccountAgeHours ?? 0}\` saat${(r.minAccountAgeHours ?? 0) === 0 ? " (Kapalı)" : ""}`,
          ].join("\n")],
          ["Uyarı", [
            `Eşik: \`${w.threshold ?? "—"}\` uyarı`,
            `Timeout süresi: \`${fmtMs(w.timeoutMs ?? 0)}\``,
          ].join("\n")],
        ]);
      } else throw new UserInputError("Kullanım: ayarlar [log|mesaj/message|raid|uyarı/warning|politikalar/policies]. Ayrıntı: yardım settings");
      await Guild.updateOne({ guildId: message.guild.id }, { $set: set }, { upsert: true, runValidators: true });
      await recordCase(message, "settings", message.guild.id, args.join(" "));
      return message.reply("✅ Ayarlar güncellendi: " + Object.entries(set).map(([k, v]) => `${k} = ${v}`).join(", "));
    }
    const g = (k) => data?.guards?.[k];
    const fields = Object.entries(GUARDS).map(([key, def]) => ({
      name: `${dot(g(key)?.enabled)} ${def.name}`,
      value: key === "tag" ? `Rol: ${rl(data?.tagRole)}` : `${ch(data?.logs?.[key])} · ${g(key)?.punish ?? "—"}`,
      inline: true,
    }));
    fields.push(
      { name: "🎖️ Karantina", value: `${rl(data?.quarantineRole)}`, inline: true },
      { name: "📋 Safelist", value: `\`${data?.safelist?.length ?? 0}\` kişi`, inline: true },
      { name: "🔒 Kilit", value: `\`${(data?.disabledChannels?.length ?? 0) + (data?.commandChannels?.length ?? 0)}\` kanal`, inline: true },
      { name: "Eşikler", value: `Ban ${data.limits.ban} • Kick ${data.limits.kick} • Katılım ${data.limits.joins} • Susturma ${data.limits.timeout}` },
      { name: "Politikalar", value: "Ayrıntı: ayarlar politikalar • Değiştirme: yardım settings" },
    );
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Blurple)
      .setTitle(`⚙️ ${message.guild.name}`).addFields(fields).setTimestamp()] });
  },
};
