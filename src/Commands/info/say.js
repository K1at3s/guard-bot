import { UserInputError } from "../../Utils/errors.js";
import { EmbedBuilder, Colors, PermissionsBitField } from "discord.js";

export const commandBase = {
  name: "say",
  aliases: ["istatistik"],
  description: "Sunucu istatistikleri.",
  perms: PermissionsBitField.Flags.ManageGuild,
  cooldown: 10,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const { guild } = message;
    if (args[0] && args[0] !== "detay") throw new UserInputError(isTurkish ? "Kullanım: say [detay]" : "Usage: say [detail]");
    await guild.members.fetch();
    const online = guild.members.cache.filter((m) => ["online", "idle", "dnd"].includes(m.presence?.status)).size;
    const voice = guild.members.cache.filter((m) => m.voice.channel).size;
    const tagged = guild.members.cache.filter((m) => m.user.primaryGuild?.identityGuildId === guild.id).size;
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(Colors.Blurple)
      .setTitle(`📊 ${guild.name}`)
      .addFields(
        { name: isTurkish ? "👥 Üye" : "👥 Members", value: `\`${guild.memberCount}\` (${online} ${isTurkish?"çevrimiçi":"online"})`, inline: true },
        { name: isTurkish ? "🔊 Seste" : "🔊 In voice", value: `\`${voice}\``, inline: true },
        { name: isTurkish ? "🏷️ Taglı" : "🏷️ Tagged", value: `\`${tagged}\``, inline: true },
        { name: isTurkish ? "🚀 Boost" : "🚀 Boost", value: `\`${guild.premiumSubscriptionCount ?? 0}\` (${isTurkish?"Seviye":"Tier"} ${guild.premiumTier})`, inline: true },
        { name: isTurkish ? "İnsan / Bot" : "Humans / Bots", value: `${guild.members.cache.filter((m) => !m.user.bot).size} / ${guild.members.cache.filter((m) => m.user.bot).size}`, inline: true },
        { name: isTurkish ? "Kanal / Rol" : "Channels / Roles", value: `${guild.channels.cache.size} / ${guild.roles.cache.size}`, inline: true },
        ...(args[0] === "detay" ? [
          { name: isTurkish ? "Sunucu yaşı" : "Server age", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R> ${isTurkish?"kuruldu":"created"}`, inline: true },
          { name: isTurkish ? "Son 24 saatte katılan" : "Joined in last 24h", value: String(guild.members.cache.filter((m) => m.joinedTimestamp > Date.now() - 86400000).size), inline: true },
          { name: isTurkish ? "Yönetici / Susturulmuş" : "Admins / Timed out", value: `${guild.members.cache.filter((m) => m.permissions.has(PermissionsBitField.Flags.Administrator)).size} / ${guild.members.cache.filter((m) => m.communicationDisabledUntilTimestamp > Date.now()).size}`, inline: true },
        ] : []),
      ).setFooter({ text: "Çevrimiçi ve ses sayıları mevcut gateway önbelleğine dayanır." }).setTimestamp()] });
  },
};
