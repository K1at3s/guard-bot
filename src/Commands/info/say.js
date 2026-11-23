import { UserInputError } from "../../Utils/errors.js";
import { EmbedBuilder, Colors, PermissionsBitField } from "discord.js";

export const commandBase = {
  name: "say",
  aliases: ["istatistik"],
  description: "Sunucu istatistikleri.",
  perms: PermissionsBitField.Flags.ManageGuild,
  cooldown: 10,
  async run(client, message, args) {
    const { guild } = message;
    if (args[0] && args[0] !== "detay") throw new UserInputError("Kullanım: say [detay]");
    await guild.members.fetch();
    const online = guild.members.cache.filter((m) => ["online", "idle", "dnd"].includes(m.presence?.status)).size;
    const voice = guild.members.cache.filter((m) => m.voice.channel).size;
    const tagged = guild.members.cache.filter((m) => m.user.primaryGuild?.identityGuildId === guild.id).size;
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Blurple)
      .setTitle(`📊 ${guild.name}`)
      .addFields(
        { name: "👥 Üye", value: `\`${guild.memberCount}\` (${online} çevrimiçi)`, inline: true },
        { name: "🔊 Seste", value: `\`${voice}\``, inline: true },
        { name: "🏷️ Taglı", value: `\`${tagged}\``, inline: true },
        { name: "🚀 Boost", value: `\`${guild.premiumSubscriptionCount ?? 0}\` (Seviye ${guild.premiumTier})`, inline: true },
        { name: "İnsan / Bot", value: `${guild.members.cache.filter((m) => !m.user.bot).size} / ${guild.members.cache.filter((m) => m.user.bot).size}`, inline: true },
        { name: "Kanal / Rol", value: `${guild.channels.cache.size} / ${guild.roles.cache.size}`, inline: true },
        ...(args[0] === "detay" ? [
          { name: "Sunucu yaşı", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R> kuruldu`, inline: true },
          { name: "Son 24 saatte katılan", value: String(guild.members.cache.filter((m) => m.joinedTimestamp > Date.now() - 86400000).size), inline: true },
          { name: "Yönetici / Susturulmuş", value: `${guild.members.cache.filter((m) => m.permissions.has(PermissionsBitField.Flags.Administrator)).size} / ${guild.members.cache.filter((m) => m.communicationDisabledUntilTimestamp > Date.now()).size}`, inline: true },
        ] : []),
      ).setFooter({ text: "Çevrimiçi ve ses sayıları mevcut gateway önbelleğine dayanır." }).setTimestamp()] });
  },
};
