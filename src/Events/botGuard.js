import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, auditEntry, isExempt, punish, sendLog, logExempt, claimAudit, attempt } from "../Utils/guard.js";
export default {
  name: Events.GuildMemberAdd, roles: ["guard1"],
  async execute(member) {
    if (!member.user.bot) return;
    const guild = member.guild;
    const data = await settings(guild.id);
    if (!data.guards.bot.enabled || isExempt(guild, member.id, data)) return;
    const entry = await auditEntry(guild, AuditLogEvent.BotAdd, member.id);
    if (entry?.executor && isExempt(guild, entry.executor.id, data)) return logExempt(guild, "bot", entry.executor.tag, "güvenilir bot ekledi");
    if (entry && !claimAudit(guild.id, entry, "bot")) return;
    const removed = await attempt(guild, "İzinsiz bot çıkarma", () => member.kick("Guard: izinsiz bot ekleme"));
    const result = entry?.executor ? await punish(guild, entry.executor.id, data.guards.bot.punish, "İzinsiz bot ekledi") : "Ekleyen audit kaydında bulunamadı";
    return sendLog(guild, "bot", new EmbedBuilder().setColor(Colors.Red).setTitle("Bot Koruma")
      .addFields({ name: "Bot", value: member.user.tag + " • " + member.id }, { name: "Ekleyen", value: entry?.executor?.tag || "Bilinmiyor" },
        { name: "Bot çıkarma", value: removed }, { name: "Ceza", value: result }).setTimestamp());
  },
};
