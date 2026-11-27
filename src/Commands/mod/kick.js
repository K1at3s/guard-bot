import { PermissionsBitField } from "discord.js";
import { resolveMember, assertTarget, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
export const commandBase = {
  name: "kick", aliases: ["at"], description: "Rol sırasını doğrulayarak üyeyi atar ve işlem kaydı oluşturur.", perms: PermissionsBitField.Flags.KickMembers, cooldown: 3,
  async run(client, message, args) {
    const isTurkish = message.isTurkish ?? message.interaction?.locale?.startsWith("tr") ?? (message.guild?.preferredLocale?.startsWith("tr") ?? true);
    const member = await resolveMember(message.guild, args[0]);
    assertTarget(message, member, "kickable");
    const reason = reasonText(args.slice(1));
    await member.kick(auditReason(message, reason));
    const id = await recordCase(message, "kick", member.id, reason);
    return report(message, isTurkish ? "Üye atıldı" : "Member kicked", [[isTurkish?"Üye":"Member", member.user.tag], [isTurkish?"Sebep":"Reason", reason], [isTurkish?"Kayıt":"Record", id]]);
  },
};
