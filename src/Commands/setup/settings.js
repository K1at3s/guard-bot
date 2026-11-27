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
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const data = await settings(message.guild.id);
    if (args[0]) {
      const [sub, key, raw] = args;
      const set = {};
      if (sub === "log") {
        if (!Object.hasOwn(GUARDS, key) && key !== "mod") throw new UserInputError(isTurkish ? "Geçerli bir koruma sistemi girin." : "Enter a valid guard system.");
        const channel = message.guild.channels.cache.get(snowflake(raw));
        if (!channel?.isTextBased() || channel.isThread?.()) throw new UserInputError(isTurkish ? "Geçerli log kanalı seçin." : "Select a valid log channel.");
        if (channel.permissionsFor(message.guild.roles.everyone)?.has(PermissionsBitField.Flags.ViewChannel)) throw new UserInputError(isTurkish ? "Log kanalı herkese açık olamaz. Önce @everyone için Kanalı Görüntüle iznini kapatın." : "Log channel cannot be public. Disable View Channel for @everyone first.");
        set[`logs.${key}`] = channel.id;
      } else if (sub === "mesaj" || sub === "message" || sub === "raid") {
        if ((sub === "mesaj" || sub === "message") && ["hariç-ekle","haric-ekle","exclude-add","hariç-kaldır","haric-kaldir","exclude-remove"].includes(key)) {
          const id = snowflake(raw);
          if (!message.guild.channels.cache.get(id)?.isTextBased()) throw new UserInputError(isTurkish ? "Geçerli kanal seçin." : "Select a valid channel.");
          await Guild.updateOne({ guildId: message.guild.id }, { [["hariç-ekle","haric-ekle","exclude-add"].includes(key) ? "$addToSet" : "$pull"]: { "messagePolicy.ignoredChannels": id } }, { upsert: true });
          return message.reply(isTurkish ? "✅ Mesaj korumasının kanal istisnası güncellendi. Token sızıntısı kontrolü devam eder." : "✅ Message protection channel exception updated. Token leak scanning still applies.");
        }
        set[`${(sub === "mesaj" || sub === "message") ? "messagePolicy" : "raidPolicy"}.${key}`] = policyValue((sub === "mesaj" || sub === "message") ? MESSAGE_OPTIONS : RAID_OPTIONS, key, raw);
      } else if (sub === "uyarı" || sub === "uyari" || sub === "warning") {
        const threshold = Number(key), ms = duration(raw);
        if (!Number.isInteger(threshold) || threshold < 1 || threshold > 20 || !ms) throw new UserInputError(isTurkish ? "Kullanım: ayarlar uyarı <1..20> <1m|1h|1d>" : "Usage: settings warning <1..20> <1m|1h|1d>");
        set["warningPolicy.threshold"] = threshold;
        set["warningPolicy.timeoutMs"] = ms;
      } else if (sub === "politikalar" || sub === "policies") {
        const m = data.messagePolicy?.toObject?.() ?? data.messagePolicy ?? {};
        const r = data.raidPolicy?.toObject?.() ?? data.raidPolicy ?? {};
        const w = data.warningPolicy?.toObject?.() ?? data.warningPolicy ?? {};
        const ignored = (m.ignoredChannels ?? []).map((id) => `<#${id}>`).join(", ") || "`Yok`";
        return report(message, isTurkish ? "Koruma politikaları" : "Protection policies", [
          [isTurkish ? "Mesaj" : "Message", [
            `${isTurkish ? "Davet linkleri" : "Invite links"}: ${m.invites ? (isTurkish?"🟢 Açık":"🟢 On") : (isTurkish?"🔴 Kapalı":"🔴 Off")}`,
            `${isTurkish ? "Scam linkleri" : "Scam links"}: ${m.scam ? (isTurkish?"🟢 Açık":"🟢 On") : (isTurkish?"🔴 Kapalı":"🔴 Off")}`,
            `${isTurkish ? "Mention limiti" : "Mention limit"}: \`${m.mentions ?? "—"}\``,
            `${isTurkish ? "Flood" : "Flood"}: \`${m.flood ?? "—"}\` ${isTurkish?"mesaj":"messages"} / \`${fmtMs(m.floodWindowMs ?? 0)}\``,
            `${isTurkish ? "Tekrar" : "Duplicates"}: \`${m.duplicates ?? "—"}\``,
            `${isTurkish ? "Emoji limiti" : "Emoji limit"}: \`${m.emojis ?? "—"}\``,
            `${isTurkish ? "Büyük harf" : "Caps"}: \`%${m.capsPercent ?? "—"}\` (${isTurkish?"min":"min"} ${m.capsMinLength ?? "—"} ${isTurkish?"karakter":"chars"})`,
            `${isTurkish ? "Mesaj timeout" : "Message timeout"}: \`${fmtMs(m.timeoutMs ?? 0)}\``,
            `${isTurkish ? "İstisna kanallar" : "Ignored channels"}: ${ignored}`,
          ].join("\n")],
          [isTurkish ? "Raid" : "Raid", [
            `${isTurkish ? "Katılım penceresi" : "Join window"}: \`${fmtMs(r.windowMs ?? 0)}\``,
            `${isTurkish ? "Raid süresi" : "Raid duration"}: \`${fmtMs(r.durationMs ?? 0)}\``,
            `${isTurkish ? "Min. hesap yaşı" : "Min account age"}: \`${r.minAccountAgeHours ?? 0}\` ${isTurkish?"saat":"hours"}${(r.minAccountAgeHours ?? 0) === 0 ? (isTurkish?" (Kapalı)":" (Off)") : ""}`,
          ].join("\n")],
          [isTurkish ? "Uyarı" : "Warning", [
            `${isTurkish ? "Eşik" : "Threshold"}: \`${w.threshold ?? "—"}\` ${isTurkish?"uyarı":"warnings"}`,
            `${isTurkish ? "Timeout süresi" : "Timeout duration"}: \`${fmtMs(w.timeoutMs ?? 0)}\``,
          ].join("\n")],
        ]);
      } else throw new UserInputError(isTurkish ? "Kullanım: ayarlar [log|mesaj|raid|uyarı|politikalar]. Ayrıntı: yardım settings" : "Usage: settings [log|message|raid|warning|policies]. Details: help settings");
      await Guild.updateOne({ guildId: message.guild.id }, { $set: set }, { upsert: true, runValidators: true });
      await recordCase(message, "settings", message.guild.id, args.join(" "));
      return message.reply((isTurkish ? "✅ Ayarlar güncellendi: " : "✅ Settings updated: ") + Object.entries(set).map(([k, v]) => `${k} = ${v}`).join(", "));
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
