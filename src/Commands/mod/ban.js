import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { resolveMember, assertTarget, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
export const commandBase = {
  name: "ban", aliases: [], description: "Üyeyi banlar; isteğe bağlı son 7 güne kadar mesajlarını siler.", perms: PermissionsBitField.Flags.BanMembers, cooldown: 3,
  async run(client, message, args) {
    const member = await resolveMember(message.guild, args[0]);
    assertTarget(message, member, "bannable");
    const options = args.filter((arg) => arg.startsWith("--sil="));
    const days = options.length ? Number(options[0].slice(6)) : 0;
    if (options.length > 1 || !Number.isInteger(days) || days < 0 || days > 7) throw new UserInputError("--sil değeri 0–7 arasında bir tam sayı olmalı.");
    const reason = reasonText(args.slice(1).filter((arg) => !arg.startsWith("--sil=")));
    await member.ban({ reason: auditReason(message, reason), deleteMessageSeconds: days * 86400 });
    const id = await recordCase(message, "ban", member.id, reason, { deletedDays: days });
    return report(message, "Ban uygulandı", [["Üye", member.user.tag], ["Sebep", reason], ["Mesaj silme", days + " gün"], ["Kayıt", id]]);
  },
};
