import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { snowflake, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
const running = new Set();
export const commandBase = {
  name: "lock", aliases: ["kilit"], description: "Kanalı kilitler; açarken önceki mesaj iznini geri yükler.", perms: PermissionsBitField.Flags.ManageChannels, cooldown: 3,
  async run(client, message, args) {
    const sub = args[0] ?? "durum";
    if (!["aç", "kapat", "durum"].includes(sub)) throw new UserInputError("Kullanım: lock aç|kapat|durum [#kanal] [sebep]");
    const targetId = snowflake(args[1]);
    const channel = targetId ? message.guild.channels.cache.get(targetId) : message.channel;
    if (!channel?.permissionOverwrites || !channel.isTextBased() || channel.isThread?.()) throw new UserInputError("Yazı kanalı seçin; thread kilidi desteklenmez.");
    if (!channel.permissionsFor(message.member)?.has(PermissionsBitField.Flags.ManageChannels)) throw new UserInputError("Bu kanalı yönetme yetkiniz yok.");
    const key = message.guild.id + ":" + channel.id;
    if (running.has(key)) throw new UserInputError("Bu kanal için işlem sürüyor.");
    running.add(key);
    try {
      const data = await settings(message.guild.id);
      const saved = data.channelLocks.find((l) => l.channelId === channel.id);
      const overwrite = channel.permissionOverwrites.cache.get(message.guild.id);
      const current = overwrite?.deny.has(PermissionsBitField.Flags.SendMessages) ? false : overwrite?.allow.has(PermissionsBitField.Flags.SendMessages) ? true : null;
      if (["durum","status","info"].includes(sub)) return report(message, "Kanal kilidi", [["Kanal", channel.name], ["Mesaj izni", current === false ? "Engelli" : current === true ? "İzinli" : "Devralınıyor"], ["Kayıtlı kilit", saved ? "Var" : "Yok"]]);
      const reason = reasonText(args.slice(targetId ? 2 : 1));
      if (["kapat","close","lock"].includes(sub)) {
        if (saved) return message.reply("ℹ️ Kanal zaten bot tarafından kilitlenmiş.");
        await Guild.updateOne({ guildId: message.guild.id }, { $push: { channelLocks: { channelId: channel.id, sendMessages: current } } }, { upsert: true });
        try { await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason: auditReason(message, reason) }); }
        catch (err) { await Guild.updateOne({ guildId: message.guild.id }, { $pull: { channelLocks: { channelId: channel.id } } }); throw err; }
      } else {
        if (!saved) throw new UserInputError("Bu botun kaydettiği kilit bulunamadı; mevcut izin otomatik değiştirilmeyecek.");
        await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: saved.sendMessages }, { reason: auditReason(message, reason) });
        await Guild.updateOne({ guildId: message.guild.id }, { $pull: { channelLocks: { channelId: channel.id } } });
      }
      await recordCase(message, sub === "kapat" ? "lock" : "unlock", channel.id, reason);
      return message.reply(sub === "kapat" ? "🔒 Kanal kilitlendi." : "🔓 Önceki kanal izni geri yüklendi.");
    } finally { running.delete(key); }
  },
};
