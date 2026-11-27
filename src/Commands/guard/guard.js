import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField, EmbedBuilder, Colors } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { GUARDS, settings } from "../../Utils/guard.js";
import { PROFILES } from "../../Utils/policy.js";
import { report, recordCase } from "../../Utils/command.js";

const PUNISH_TR = { quarantine: "karantina", kick: "kick", ban: "ban" };
const PUNISH_EN = { karantina: "quarantine", quarantine: "quarantine", kick: "kick", ban: "ban" };
const SYSTEM_ALIASES = {
  ban:"ban", yasak:"ban", kick:"kick", atma:"kick", bot:"bot", raid:"raid", baskin:"raid",
  channel:"channel", kanal:"channel", role:"role", rol:"role", emoji:"emoji", sticker:"sticker", cikartma:"sticker",
  webhook:"webhook", server:"server", sunucu:"server", message:"message", mesaj:"message", tag:"tag", etiket:"tag", timeout:"timeout", susturma:"timeout"
};
const sysKey = (v) => SYSTEM_ALIASES[String(v ?? "").toLowerCase()] ?? (Object.hasOwn(GUARDS, v) ? v : null);

async function statusEmbed(guildId) {
  const data = await settings(guildId);
  const lines = Object.entries(GUARDS).map(([key, g]) => {
    const s = data.guards[key];
    return `${s?.enabled ? "🟢" : "🔴"} \`${key}\` ${g.name} (ceza: ${PUNISH_TR[s?.punish] ?? s?.punish})`;
  });
  return new EmbedBuilder().setColor(Colors.Blurple).setTitle("🛡️ Guard Sistemleri")
    .setDescription(lines.join("\n")).setTimestamp();
}

export const commandBase = {
  name: "guard",
  aliases: ["koruma"],
  description: "Guard sistemlerini yönetir.",
  perms: PermissionsBitField.Flags.ManageGuild,
  cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? true;
    const [sub, a, b] = args;
    const data = await settings(message.guild.id);
    if (sub === "bilgi" || sub === "info") {
      const key = sysKey(a);
      if (!key) throw new UserInputError(isTurkish ? "Geçerli bir sistem adı girin; `.guard durum` ile görebilirsiniz." : "Enter a valid system name; use `.guard status`.");
      return report(message, GUARDS[key].name, [["Görevli", GUARDS[key].roles.join(", ")], ["Durum", data.guards[key].enabled ? "Açık" : "Kapalı"], ["Ceza", data.guards[key].punish], ["Eşik", GUARDS[key].limit ? data.limits[GUARDS[key].limit] : "Anında / sistem politikası"], ["Log kanalı", data.logs?.[key] || "Ayarlanmamış"]]);
    }
    if (sub === "profil" || sub === "profile") {
      const profile = Object.hasOwn(PROFILES, a) ? PROFILES[a] : null;
      if (!profile) throw new UserInputError(isTurkish ? "Profiller: dengeli, sıkı" : "Profiles: balanced, strict");
      const set = {};
      for (const [group, values] of Object.entries(profile)) for (const [key, value] of Object.entries(values)) set[`${group}.${key}`] = value;
      await Guild.updateOne({ guildId: message.guild.id }, { $set: set }, { upsert: true, runValidators: true });
      await recordCase(message, "guard-profile", message.guild.id, a);
      return message.reply(isTurkish ? `✅ ${a} profili uygulandı. Korumaların açık/kapalı durumu korunur.` : `✅ Profile ${a} applied. Guard on/off states were preserved.`);
    }
    if (["aç","ac","open","enable","kapat","close","disable"].includes(sub) && ["tümü","hepsi","all"].includes(a)) {
      const set = Object.fromEntries(Object.keys(GUARDS).filter((key) => key !== "tag").map((key) => [`guards.${key}.enabled`, ["aç","ac","open","enable"].includes(sub)]));
      await Guild.updateOne({ guildId: message.guild.id }, { $set: set }, { upsert: true });
      await recordCase(message, "guard-all", message.guild.id, ["aç","ac","open","enable"].includes(sub)?"aç":"kapat");
      return message.reply(isTurkish ? `✅ Tüm güvenlik korumaları ${["aç","ac","open","enable"].includes(sub) ? "açıldı" : "kapatıldı"}. Tag rolü ayrı yönetilir.` : `✅ All security guards ${["aç","ac","open","enable"].includes(sub) ? "enabled" : "disabled"}. Tag role is managed separately.`);
    }

    if (!sub || ["liste","list","durum","status"].includes(sub)) {
      return message.channel.send({ embeds: [await statusEmbed(message.guild.id)] });
    }
    const key = sysKey(a);
    if (!key && sub !== "limit") {
      return message.channel.send(isTurkish ? "❌ Sistem bulunamadı. Kullanım: `.guard durum` | `.guard aç/kapat <sistem|tümü>` | `.guard ceza <sistem> <karantina|kick|ban>` | `.guard limit <ban|kick|katılım|susturma> <1-100>` | `.guard profil <dengeli|sıkı>`" : "❌ System not found. Usage: `.guard status` | `.guard on/off <system|all>` | `.guard punish <system> <quarantine|kick|ban>` | `.guard limit <ban|kick|joins|timeout> <1-100>` | `.guard profile <balanced|strict>`");
    }

    if (["aç","ac","open","enable","kapat","close","disable"].includes(sub)) {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`guards.${key}.enabled`]: ["aç","ac","open","enable"].includes(sub) } }, { upsert: true });
      return message.channel.send(`${["aç","ac","open","enable"].includes(sub) ? "🟢" : "🔴"} **${GUARDS[key].name}** ${["aç","ac","open","enable"].includes(sub) ? (isTurkish?"açıldı":"enabled") : (isTurkish?"kapatıldı":"disabled")}.`);
    }
    if (sub === "ceza" || sub === "punish") {
      const mode = Object.hasOwn(PUNISH_EN, b) ? PUNISH_EN[b] : null;
      if (!mode) return message.channel.send(isTurkish ? "❌ Kullanım: `.guard ceza <sistem> <karantina|kick|ban>`" : "❌ Usage: `.guard punish <system> <quarantine|kick|ban>`");
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`guards.${key}.punish`]: mode } }, { upsert: true });
      return message.channel.send(isTurkish ? `✅ **${GUARDS[key].name}** ceza modu: **${b}**.` : `✅ **${GUARDS[key].name}** punishment mode: **${b}**.`);
    }
    if (sub === "limit") {
      const field = a === "katılım" ? "joins" : a === "susturma" ? "timeout" : a;
      const n = Number(b);
      if (!["ban", "kick", "joins", "timeout"].includes(field) || !Number.isInteger(n) || n < 1 || n > 100) {
        return message.channel.send(isTurkish ? "❌ Kullanım: `.guard limit <ban|kick|katılım|susturma> <sayı>`" : "❌ Usage: `.guard limit <ban|kick|joins|timeout> <number>`");
      }
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`limits.${field}`]: n } }, { upsert: true });
      return message.channel.send(isTurkish ? `✅ Limit güncellendi: **${field}** = \`${n}\`.` : `✅ Limit updated: **${field}** = \`${n}\`.`);
    }
    return message.channel.send({ embeds: [await statusEmbed(message.guild.id)] });
  },
};
