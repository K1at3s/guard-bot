import { Events, EmbedBuilder, Colors, User } from "discord.js";
import { settings, sendLog } from "../Utils/guard.js";
import { assertAutomationRole } from "../Utils/authorization.js";
import Quarantine from "../Database/schemas/Quarantine.js";

const hasTag = (member) => member.user.primaryGuild?.identityGuildId === member.guild.id && member.user.primaryGuild?.identityEnabled !== false;

async function syncMember(guild, userId) {
  const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
  if (!member || member.user.bot) return;
  const data = await settings(guild.id);
  if (!data.guards.tag?.enabled || !data.tagRole) return;
  const role = guild.roles.cache.get(data.tagRole);
  if (!role) return;
  assertAutomationRole(guild, role, data.quarantineRole);
  if (data.quarantineRole && member.roles.cache.has(data.quarantineRole)) return;
  if (await Quarantine.exists({ _id: `${guild.id}:${member.id}` })) return;
  const tagged = hasTag(member);
  const hasRole = member.roles.cache.has(role.id);
  if (tagged === hasRole) return;
  let ok = false;
  if (tagged) ok = await member.roles.add(role).then(() => true).catch(() => false);
  else ok = await member.roles.remove(role).then(() => true).catch(() => false);
  if (!ok) {
    guild.client.logger.error(`[tagRole] rol işlemi başarısız: ${member.user.tag}`);
    return;
  }
  guild.client.logger.info(`[tagRole] ${member.user.tag}: ${tagged ? "rol verildi" : "rol alındı"}`);
  const ch = data.logs?.tag ? guild.channels.cache.get(data.logs.tag) : null;
  if (ch?.isTextBased()) {
    await ch.send({ embeds: [new EmbedBuilder().setColor(tagged ? Colors.Green : Colors.Red)
      .setTitle(tagged ? "🏷️ Tag Alındı" : "🏷️ Tag Bırakıldı")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "Kullanıcı", value: `${member} (\`${member.id}\`)` },
        { name: "Tag", value: `\`${member.user.primaryGuild?.tag ?? "—"}\``, inline: true },
        { name: "Rol", value: `${role}`, inline: true },
      ).setTimestamp()] }).catch(() => {});
  }
}

export default {
  // Tag değişimi guildMemberUpdate yayınlamaz (equals user'a bakmaz) — sinyal userUpdate'ten gelir.
  name: [Events.GuildMemberUpdate, Events.GuildMemberAdd, Events.UserUpdate],
  roles: ["guard3"],
  async execute(a, b) {
    const log = (b ?? a)?.client?.logger ?? console;
    try {
      if (a instanceof User && b instanceof User) {
        const ids = new Set([a.primaryGuild?.identityGuildId, b.primaryGuild?.identityGuildId].filter(Boolean));
        for (const id of ids) {
          const guild = b.client.guilds.cache.get(id);
          if (guild) await syncMember(guild, b.id);
        }
        return;
      }
      const m = b ?? a;
      if (!m?.guild) return;
      await syncMember(m.guild, m.id);
    } catch (err) { log.error?.(`[tagRole] ${err.message}`); }
  },
};
