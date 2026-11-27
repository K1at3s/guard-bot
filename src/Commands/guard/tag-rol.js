import { assertAutomationRole } from "../../Utils/authorization.js";
import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { snowflake, report, recordCase } from "../../Utils/command.js";
import Quarantine from "../../Database/schemas/Quarantine.js";
const running = new Set();
export const commandBase = {
  name: "tag-rol", aliases: ["tagrol","tag-role","tagrole"], description: "Güvenli tag rolü ayarlar ve mevcut üyelerin rollerini eşitler.", perms: PermissionsBitField.Flags.ManageGuild, cooldown: 5,
  async run(client, message, args) {
    const data = await settings(message.guild.id);
    const sub = args[0] ?? "durum";
    if (["durum","status","info"].includes(sub)) return report(message, "Tag rolü", [["Durum", data.guards.tag.enabled ? "Açık" : "Kapalı"], ["Rol", data.tagRole || "Ayarlanmamış"]]);
    if (["kapat","close","disable","off"].includes(sub)) {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { "guards.tag.enabled": false } });
      return message.reply("⏹️ Tag rol otomasyonu kapatıldı; mevcut roller korundu.");
    }
    const id = sub === "eşitle" ? data.tagRole : snowflake(args[1] ?? args[0]);
    const role = message.guild.roles.cache.get(id);
    assertAutomationRole(message.guild, role, data.quarantineRole);
    if (sub !== "eşitle") {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { tagRole: role.id, "guards.tag.enabled": true } }, { upsert: true });
      await recordCase(message, "tag-role", role.id, "Tag rolü ayarlandı");
      return message.reply("✅ Tag rolü ayarlandı: " + role.name + ". Mevcut üyeler için tag-rol eşitle kullanın.");
    }
    if (running.has(message.guild.id)) throw new UserInputError("Tag eşitleme zaten sürüyor.");
    running.add(message.guild.id);
    try {
      const members = await message.guild.members.fetch();
      const quarantined = new Set((await Quarantine.find({ guildId: message.guild.id }).select("userId").lean()).map((entry) => entry.userId));
      let added = 0, removed = 0, failed = 0;
      for (const member of members.values()) {
        if (member.user.bot || quarantined.has(member.id) || (data.quarantineRole && member.roles.cache.has(data.quarantineRole))) continue;
        assertAutomationRole(message.guild, role, data.quarantineRole);
        const tagged = member.user.primaryGuild?.identityGuildId === message.guild.id && member.user.primaryGuild?.identityEnabled !== false;
        if (tagged === member.roles.cache.has(role.id)) continue;
        try { if (tagged) { await member.roles.add(role, "Tag eşitleme"); added++; } else { await member.roles.remove(role, "Tag eşitleme"); removed++; } }
        catch (err) { failed++; client.logger.error("[Tag eşitleme] " + member.id + ": " + err.message); }
      }
      return report(message, "Tag eşitleme tamamlandı", [["Rol verilen", added], ["Rol alınan", removed], ["Başarısız", failed]]);
    } finally { running.delete(message.guild.id); }
  },
};
