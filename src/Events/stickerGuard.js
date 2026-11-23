import { Events, EmbedBuilder, Colors, AuditLogEvent, StickerFormatType } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, logExempt, claimAudit, attempt } from "../Utils/guard.js";
import { matchesChanges } from "../Utils/audit.js";
export default {
  name: [Events.GuildStickerCreate, Events.GuildStickerDelete, Events.GuildStickerUpdate], roles: ["guard2"],
  async execute(oldSticker, newSticker) {
    const sticker = newSticker ?? oldSticker;
    const guild = sticker.guild;
    if (!guild) return;
    const data = await settings(guild.id);
    if (!data.guards.sticker.enabled) return;
    const deleted = this.eventName === Events.GuildStickerDelete || (!newSticker && !guild.stickers.cache.has(sticker.id));
    const type = newSticker ? AuditLogEvent.StickerUpdate : deleted ? AuditLogEvent.StickerDelete : AuditLogEvent.StickerCreate;
    const entry = await auditEntry(guild, type, sticker.id, 10,
      (entry) => !newSticker || matchesChanges(entry, oldSticker, newSticker, { name: "name", description: "description", tags: "tags" }));
    if (!entry?.executor || !claimAudit(guild.id, entry, "sticker")) return;
    if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "sticker", entry.executor.tag, "sticker işlemi yaptı");
    const result = await punish(guild, entry.executor.id, data.guards.sticker.punish, "İzinsiz sticker işlemi");
    const recovery = deleted && sticker.format === StickerFormatType.Lottie ? "Lottie sticker otomatik geri oluşturulamaz" : await attempt(guild, "Sticker geri alma", async () => {
      if (deleted) await guild.stickers.create({ file: sticker.url, name: sticker.name, description: sticker.description || "Guard kurtarma", tags: sticker.tags || "🙂", reason: "Guard: silinen sticker" });
      else if (newSticker) await newSticker.edit({ name: oldSticker.name, description: oldSticker.description, tags: oldSticker.tags, reason: "Guard: sticker geri alma" });
      else await sticker.delete("Guard: izinsiz sticker");
    });
    return sendLog(guild, "sticker", new EmbedBuilder().setColor(Colors.Red).setTitle("Sticker Koruma").setDescription(entry.executor.tag + " • " + sticker.name)
      .addFields({ name: "Ceza", value: result }, { name: "Geri alma", value: recovery }).setTimestamp());
  },
};
