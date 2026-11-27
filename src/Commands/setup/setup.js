import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField, EmbedBuilder, Colors, ChannelType } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings, activeGuardBotIds } from "../../Utils/guard.js";
import { report } from "../../Utils/command.js";

// kanal adı -> logs anahtarı
const LOGS = [
  ["ban-log", "ban"], ["kick-log", "kick"], ["bot-log", "bot"],
  ["kanal-logu", "channel"], ["rol-logu", "role"], ["emoji-logu", "emoji"],
  ["sticker-logu", "sticker"], ["webhook-logu", "webhook"], ["sunucu-logu", "server"],
  ["tag-log", "tag"], ["raid-log", "raid"], ["mesaj-logu", "message"], ["mod-log", "mod"],
  ["timeout-log", "timeout"],
];

export const commandBase = {
  name: "setup",
  aliases: ["kurulum"],
  description: "Log kanallarını kurar, guardları varsayılanlarla açar.",
  perms: PermissionsBitField.Flags.Administrator,
  cooldown: 10,
  async run(client, message, args) {
    const { guild } = message;
    const log = client.logger;
    try {
      const mode = args[0] ?? "kur";
      if (!["kur","install","onar","repair","kontrol","check"].includes(mode)) throw new UserInputError("Kullanım: setup kur/install|onar/repair|kontrol/check");
      const data = await settings(guild.id);
      if (mode === "kontrol" || mode === "check") return report(message, "Kurulum kontrolü", [["Kategori", guild.channels.cache.has(data.logCategoryId) ? "Var" : "Eksik"], ["Log kanalları", LOGS.map(([, key]) => key + ": " + (guild.channels.cache.get(data.logs?.[key])?.isTextBased() ? "Var" : "Eksik")).join("\n")], ["Onarma", "setup onar — korumaların durumunu değiştirmeden logları onarır"]]);

      const me = await guild.members.fetchMe();
      const botIds = [...new Set([me.id, ...activeGuardBotIds(data)])];
      const privateOverwrites = [{ id: guild.id, type: 0, deny: [PermissionsBitField.Flags.ViewChannel] },
        ...botIds.map((id) => ({ id, type: 1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] }))];
      let category = data.logCategoryId ? guild.channels.cache.get(data.logCategoryId) : null;
      if (!category || category.type !== ChannelType.GuildCategory) {
        category = await guild.channels.create({
          name: "📋 Bot Logları", type: ChannelType.GuildCategory,
          permissionOverwrites: privateOverwrites,
        });
        await Guild.updateOne({ guildId: guild.id }, { $set: { logCategoryId: category.id } }, { upsert: true });
      }
      await category.permissionOverwrites.set(privateOverwrites, "Guard: özel log kategorisi");

      const set = { logCategoryId: category.id };
      const lines = [];
      for (const [name, key] of LOGS) {
        let ch = guild.channels.cache.get(data.logs?.[key])
          ?? category.children.cache.find((c) => c.name === name && c.type === ChannelType.GuildText);
        if (ch?.type !== ChannelType.GuildText) ch = null;
        if (!ch) {
          ch = await guild.channels.create({ name, type: ChannelType.GuildText, parent: category.id, permissionOverwrites: privateOverwrites });
        }
        await ch.permissionOverwrites.set(privateOverwrites, "Guard: özel log kanalı");
        set[`logs.${key}`] = ch.id;
        await Guild.updateOne({ guildId: guild.id }, { $set: { [`logs.${key}`]: ch.id } }, { upsert: true });
        lines.push(`${ch} → ${key}`);
      }
      for (const key of ["ban", "kick", "bot", "channel", "role", "emoji", "sticker", "webhook", "server", "message", "raid", "timeout"]) {
        if (mode === "kur" || mode === "install") set[`guards.${key}.enabled`] = true;
      }
      await Guild.updateOne({ guildId: guild.id }, { $set: set }, { upsert: true });
      log.info(`[Setup] ${guild.name}: kurulum tamamlandı (${message.author.tag}).`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Green)
        .setTitle("✅ Kurulum Tamamlandı").setDescription(lines.join("\n")).setTimestamp()] });
    } catch (err) {
      log.error(`[Setup] ${err.message}`);
      return message.channel.send("❌ Kurulum hatası. Botun **Kanal Yönetimi** yetkisini, rol sırasını ve sunucu izinlerini kontrol edin.");
    }
  },
};
