import { assertAutomationRole } from "../../Utils/authorization.js";
import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import Guild from "../../Database/schemas/Guild.js";
import { settings } from "../../Utils/guard.js";
import { snowflake, resolveMember, assertTarget, paginate, report, recordCase } from "../../Utils/command.js";
import Quarantine from "../../Database/schemas/Quarantine.js";
export const commandBase = {
  name: "karantina", aliases: ["cezarol","quarantine"], description: "Karantina rolü ayarlar, üyeleri sayfalı listeler ve kontrollü bırakır.", perms: PermissionsBitField.Flags.ManageGuild, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const data = await settings(message.guild.id);
    const sub = args[0] ?? "durum";
    if (sub === "kapat" || sub === "close" || sub === "disable") {
      await Guild.updateOne({ guildId: message.guild.id }, { $unset: { quarantineRole: "" } });
      return message.reply(isTurkish ? "⏹️ Karantina rolü ayarı kaldırıldı; korumalar karantinada yalnız yetki rollerini alır." : "⏹️ Quarantine role setting removed; guards will only strip authority roles during quarantine.");
    }
    if (sub === "durum" || sub === "status") return report(message, isTurkish ? "Karantina" : "Quarantine", [[isTurkish?"Rol":"Role", data.quarantineRole || (isTurkish?"Ayarlanmamış":"Not set")], [isTurkish?"Bırakma":"Release", isTurkish ? "karantina bırak @üye — eski yetkiler otomatik verilmez" : "quarantine release @user — previous roles are not restored automatically"]]);
    if (sub === "listele" || sub === "liste" || sub === "list") {
      const members = await message.guild.members.fetch();
      const tracked = await Quarantine.find({ guildId: message.guild.id }).select("userId").lean();
      const list = [...new Set([...tracked.map((entry) => entry.userId), ...[...members.values()].filter((m) => data.quarantineRole && m.roles.cache.has(data.quarantineRole)).map((m) => m.id)])];
      const page = paginate(list, args[1], 12);
      return report(message, (isTurkish?"Karantinadakiler • ":"Quarantined • ") + page.page + "/" + page.pages, [[isTurkish?"Toplam":"Total", page.total], [isTurkish?"Üyeler":"Members", page.items.map((id) => id + " • " + (members.get(id)?.user.tag ?? (isTurkish?"Sunucuda yok":"Not in server"))).join("\n") || (isTurkish?"Liste boş":"List is empty")]]);
    }
    if (sub === "bırak" || sub === "birak" || sub === "release") {
      const member = await resolveMember(message.guild, args[1]);
      assertTarget(message, member, "manageable");
      const tracked = await Quarantine.exists({ _id: `${message.guild.id}:${member.id}` });
      const hasRole = data.quarantineRole && member.roles.cache.has(data.quarantineRole);
      if (!tracked && !hasRole) throw new UserInputError(isTurkish ? "Üyenin aktif karantinası bulunamadı." : "No active quarantine found for this member.");
      if (hasRole) await member.roles.remove(data.quarantineRole, "Karantina bırakma | " + message.author.id);
      await Quarantine.deleteOne({ _id: `${message.guild.id}:${member.id}` });
      await recordCase(message, "quarantine-release", member.id, isTurkish ? "Yetki rolleri geri verilmeden bırakıldı" : "Released without restoring authority roles");
      return message.reply(isTurkish ? "✅ " + member.user.tag + " karantinadan çıkarıldı. Önceki yetkiler otomatik verilmedi." : "✅ " + member.user.tag + " was released from quarantine. Previous roles were not restored automatically.");
    }
    const role = message.guild.roles.cache.get(snowflake(args[0]));
    assertAutomationRole(message.guild, role, data.tagRole);
    await Guild.updateOne({ guildId: message.guild.id }, { $set: { quarantineRole: role.id } }, { upsert: true });
    await recordCase(message, "quarantine-role", role.id, isTurkish ? "Karantina rolü ayarlandı" : "Quarantine role configured");
    return message.reply(isTurkish ? "✅ Karantina rolü ayarlandı: " + role.name + ". Kanal bazındaki izinleri ayrıca kısıtlayın." : "✅ Quarantine role set: " + role.name + ". Also restrict channel-level permissions.");
  },
};
