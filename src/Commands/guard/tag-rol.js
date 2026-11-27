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
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const data = await settings(message.guild.id);
    const sub = args[0] ?? "durum";
    if (["durum","status","info"].includes(sub)) return report(message, isTurkish ? "Tag rolü" : "Tag role", [[isTurkish?"Durum":"Status", data.guards.tag.enabled ? (isTurkish?"Açık":"On") : (isTurkish?"Kapalı":"Off")], [isTurkish?"Rol":"Role", data.tagRole || (isTurkish?"Ayarlanmamış":"Not set")]]);
    if (["kapat","close","disable","off"].includes(sub)) {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { "guards.tag.enabled": false } });
      return message.reply(isTurkish ? "⏹️ Tag rol otomasyonu kapatıldı; mevcut roller korundu." : "⏹️ Tag role automation disabled; existing roles were kept.");
    }
    const id = sub === "eşitle" ? data.tagRole : snowflake(args[1] ?? args[0]);
    const role = message.guild.roles.cache.get(id);
    assertAutomationRole(message.guild, role, data.quarantineRole);
    if (sub !== "eşitle") {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { tagRole: role.id, "guards.tag.enabled": true } }, { upsert: true });
      await recordCase(message, "tag-role", role.id, isTurkish ? "Tag rolü ayarlandı" : "Tag role configured");
      return message.reply(isTurkish ? "✅ Tag rolü ayarlandı: " + role.name + ". Mevcut üyeler için tag-rol eşitle kullanın." : "✅ Tag role set: " + role.name + ". Use tag-role sync for existing members.");
    }
    if (running.has(message.guild.id)) throw new UserInputError(isTurkish ? "Tag eşitleme zaten sürüyor." : "Tag sync is already running.");
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
      return report(message, isTurkish ? "Tag eşitleme tamamlandı" : "Tag sync completed", [[isTurkish?"Rol verilen":"Roles added", added], [isTurkish?"Rol alınan":"Roles removed", removed], [isTurkish?"Başarısız":"Failed", failed]]);
    } finally { running.delete(message.guild.id); }
  },
};
