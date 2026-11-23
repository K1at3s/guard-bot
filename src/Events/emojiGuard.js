import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, logExempt, claimAudit, attempt } from "../Utils/guard.js";
import { matchesChanges } from "../Utils/audit.js";
export default {
  name: [Events.GuildEmojiCreate, Events.GuildEmojiDelete, Events.GuildEmojiUpdate], roles: ["guard2"],
  async execute(oldEmoji, newEmoji) {
    const emoji = newEmoji ?? oldEmoji;
    const guild = emoji.guild;
    const data = await settings(guild.id);
    if (!data.guards.emoji.enabled) return;
    const deleted = this.eventName === Events.GuildEmojiDelete || (!newEmoji && !guild.emojis.cache.has(emoji.id));
    const type = newEmoji ? AuditLogEvent.EmojiUpdate : deleted ? AuditLogEvent.EmojiDelete : AuditLogEvent.EmojiCreate;
    const entry = await auditEntry(guild, type, emoji.id, 10, (entry) => !newEmoji || matchesChanges(entry,
      { name: oldEmoji.name, roles: [...oldEmoji.roles.cache.keys()] },
      { name: newEmoji.name, roles: [...newEmoji.roles.cache.keys()] }, { name: "name", roles: "roles" }));
    if (!entry?.executor || !claimAudit(guild.id, entry, "emoji")) return;
    if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "emoji", entry.executor.tag, "emoji işlemi yaptı");
    const result = await punish(guild, entry.executor.id, data.guards.emoji.punish, "İzinsiz emoji işlemi");
    const recovery = await attempt(guild, "Emoji geri alma", async () => {
      if (deleted) await guild.emojis.create({ attachment: "https://cdn.discordapp.com/emojis/" + emoji.id + (emoji.animated ? ".gif" : ".png"), name: emoji.name, roles: [...emoji.roles.cache.keys()], reason: "Guard: silinen emoji" });
      else if (newEmoji) await newEmoji.edit({ name: oldEmoji.name, roles: [...oldEmoji.roles.cache.keys()], reason: "Guard: emoji geri alma" });
      else await emoji.delete("Guard: izinsiz emoji");
    });
    return sendLog(guild, "emoji", new EmbedBuilder().setColor(Colors.Red).setTitle("Emoji Koruma").setDescription(entry.executor.tag + " • " + emoji.name)
      .addFields({ name: "Ceza", value: result }, { name: "Geri alma", value: recovery }).setTimestamp());
  },
};
