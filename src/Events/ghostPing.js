import { Events, EmbedBuilder, Colors } from "discord.js";
import { settings, sendLog, isExempt } from "../Utils/guard.js";

export default {
  name: Events.MessageDelete,
  roles: ["guard3"],
  async execute(message) {
    if (!message.guild || message.partial || message.author?.bot) return;
    const { guild } = message;
    const log = guild.client.logger;
    try {
      const data = await settings(guild.id);
      if (!data.guards.message?.enabled) return;
      if (message.mentions.users.size === 0 && !message.mentions.everyone) return;
      if (isExempt(guild, message.author.id, data)) return;
      await sendLog(guild, "message", new EmbedBuilder().setColor(Colors.Yellow)
        .setTitle("👻 Silinen Mention").setDescription(`**${message.author.tag}** mention içeren mesajı silindi (#${message.channel?.name ?? "?"}). Silen kişi bu olaydan doğrulanamaz.`)
        .addFields({ name: "Mention sayısı", value: String(message.mentions.users.size + message.mentions.roles.size) },
          { name: "Mesaj yaşı", value: `${Math.max(0, Math.floor((Date.now() - message.createdTimestamp) / 1000))} saniye` })
        .setTimestamp());
    } catch (err) { log.error(`[ghostPing] ${err.message}`); }
  },
};
