import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField, EmbedBuilder, Colors } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { GUARDS, settings } from "../../Utils/guard.js";
import { PROFILES } from "../../Utils/policy.js";
import { report, recordCase } from "../../Utils/command.js";

const PUNISH_TR = { quarantine: "karantina", kick: "kick", ban: "ban" };
const PUNISH_EN = { karantina: "quarantine", kick: "kick", ban: "ban" };

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
    const [sub, a, b] = args;
    const data = await settings(message.guild.id);
    if (sub === "bilgi") {
      if (!Object.hasOwn(GUARDS, a)) throw new UserInputError("Geçerli bir sistem adı girin; guard liste ile görebilirsiniz.");
      return report(message, GUARDS[a].name, [["Görevli", GUARDS[a].roles.join(", ")], ["Durum", data.guards[a].enabled ? "Açık" : "Kapalı"], ["Ceza", data.guards[a].punish], ["Eşik", GUARDS[a].limit ? data.limits[GUARDS[a].limit] : "Anında / sistem politikası"], ["Log kanalı", data.logs?.[a] || "Ayarlanmamış"]]);
    }
    if (sub === "profil") {
      const profile = Object.hasOwn(PROFILES, a) ? PROFILES[a] : null;
      if (!profile) throw new UserInputError("Profiller: dengeli, sıkı");
      const set = {};
      for (const [group, values] of Object.entries(profile)) for (const [key, value] of Object.entries(values)) set[`${group}.${key}`] = value;
      await Guild.updateOne({ guildId: message.guild.id }, { $set: set }, { upsert: true, runValidators: true });
      await recordCase(message, "guard-profile", message.guild.id, a);
      return message.reply(`✅ ${a} profili uygulandı. Korumaların açık/kapalı durumu korunur.`);
    }
    if (["aç", "kapat"].includes(sub) && ["tümü", "hepsi"].includes(a)) {
      const set = Object.fromEntries(Object.keys(GUARDS).filter((key) => key !== "tag").map((key) => [`guards.${key}.enabled`, sub === "aç"]));
      await Guild.updateOne({ guildId: message.guild.id }, { $set: set }, { upsert: true });
      await recordCase(message, "guard-all", message.guild.id, sub);
      return message.reply(`✅ Tüm güvenlik korumaları ${sub === "aç" ? "açıldı" : "kapatıldı"}. Tag rolü ayrı yönetilir.`);
    }

    if (!sub || sub === "liste") {
      return message.channel.send({ embeds: [await statusEmbed(message.guild.id)] });
    }
    if (!Object.hasOwn(GUARDS, a) && sub !== "limit") {
      return message.channel.send(`❌ Sistem bulunamadı. Kullanım: \`.guard liste | aç <sistem> | kapat <sistem> | ceza <sistem> <karantina|kick|ban> | limit <ban|kick|katılım|susturma> <sayı>\``);
    }

    if (sub === "aç" || sub === "kapat") {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`guards.${a}.enabled`]: sub === "aç" } }, { upsert: true });
      return message.channel.send(`${sub === "aç" ? "🟢" : "🔴"} **${GUARDS[a].name}** ${sub === "aç" ? "açıldı" : "kapatıldı"}.`);
    }
    if (sub === "ceza") {
      const mode = Object.hasOwn(PUNISH_EN, b) ? PUNISH_EN[b] : null;
      if (!mode) return message.channel.send("❌ Kullanım: `.guard ceza <sistem> <karantina|kick|ban>`");
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`guards.${a}.punish`]: mode } }, { upsert: true });
      return message.channel.send(`✅ **${GUARDS[a].name}** ceza modu: **${b}**.`);
    }
    if (sub === "limit") {
      const field = a === "katılım" ? "joins" : a === "susturma" ? "timeout" : a;
      const n = Number(b);
      if (!["ban", "kick", "joins", "timeout"].includes(field) || !Number.isInteger(n) || n < 1 || n > 100) {
        return message.channel.send("❌ Kullanım: `.guard limit <ban|kick|katılım|susturma> <sayı>`");
      }
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`limits.${field}`]: n } }, { upsert: true });
      return message.channel.send(`✅ Limit güncellendi: **${field}** = \`${n}\`.`);
    }
    return message.channel.send({ embeds: [await statusEmbed(message.guild.id)] });
  },
};
