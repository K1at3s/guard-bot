import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { snowflake, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
const running = new Set();
export const commandBase = {
  name: "lock", aliases: ["kilit"], description: "Kanalı kilitler; açarken önceki mesaj iznini geri yükler.", perms: PermissionsBitField.Flags.ManageChannels, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const sub = args[0] ?? "durum";
    if (!["aç", "kapat", "durum"].includes(sub)) throw new UserInputError(isTurkish ? "Kullanım: lock aç|kapat|durum [#kanal] [sebep]" : "Usage: lock open|close|status [#channel] [reason]");
    const targetId = snowflake(args[1]);
    const channel = targetId ? message.guild.channels.cache.get(targetId) : message.channel;
    if (!channel?.permissionOverwrites || !channel.isTextBased() || channel.isThread?.()) throw new UserInputError(isTurkish ? "Yazı kanalı seçin; thread kilidi desteklenmez." : "Select a text channel; thread lock is not supported.");
    if (!channel.permissionsFor(message.member)?.has(PermissionsBitField.Flags.ManageChannels)) throw new UserInputError(isTurkish ? "Bu kanalı yönetme yetkiniz yok." : "You do not have permission to manage this channel.");
    const key = message.guild.id + ":" + channel.id;
    if (running.has(key)) throw new UserInputError(isTurkish ? "Bu kanal için işlem sürüyor." : "An operation is already running for this channel.");
    running.add(key);
    try {
      const data = await settings(message.guild.id);
      const saved = data.channelLocks.find((l) => l.channelId === channel.id);
      const overwrite = channel.permissionOverwrites.cache.get(message.guild.id);
      const current = overwrite?.deny.has(PermissionsBitField.Flags.SendMessages) ? false : overwrite?.allow.has(PermissionsBitField.Flags.SendMessages) ? true : null;
      if (["durum","status","info"].includes(sub)) return report(message, isTurkish ? "Kanal kilidi" : "Channel lock", [[isTurkish?"Kanal":"Channel", channel.name], [isTurkish?"Mesaj izni":"Send permission", current === false ? (isTurkish?"Engelli":"Denied") : current === true ? (isTurkish?"İzinli":"Allowed") : (isTurkish?"Devralınıyor":"Inherited")], [isTurkish?"Kayıtlı kilit":"Saved lock", saved ? (isTurkish?"Var":"Yes") : (isTurkish?"Yok":"No")]]);
      const reason = reasonText(args.slice(targetId ? 2 : 1));
      if (["kapat","close","lock"].includes(sub)) {
        if (saved) return message.reply(isTurkish ? "ℹ️ Kanal zaten bot tarafından kilitlenmiş." : "ℹ️ Channel is already locked by the bot.");
        await Guild.updateOne({ guildId: message.guild.id }, { $push: { channelLocks: { channelId: channel.id, sendMessages: current } } }, { upsert: true });
        try { await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason: auditReason(message, reason) }); }
        catch (err) { await Guild.updateOne({ guildId: message.guild.id }, { $pull: { channelLocks: { channelId: channel.id } } }); throw err; }
      } else {
        if (!saved) throw new UserInputError(isTurkish ? "Bu botun kaydettiği kilit bulunamadı; mevcut izin otomatik değiştirilmeyecek." : "No lock saved by this bot was found; current permission will not be changed automatically.");
        await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: saved.sendMessages }, { reason: auditReason(message, reason) });
        await Guild.updateOne({ guildId: message.guild.id }, { $pull: { channelLocks: { channelId: channel.id } } });
      }
      await recordCase(message, sub === "kapat" ? "lock" : "unlock", channel.id, reason);
      return message.reply(["kapat","close","lock"].includes(sub) ? (isTurkish ? "🔒 Kanal kilitlendi." : "🔒 Channel locked.") : (isTurkish ? "🔓 Önceki kanal izni geri yüklendi." : "🔓 Previous channel permission restored."));
    } finally { running.delete(key); }
  },
};
