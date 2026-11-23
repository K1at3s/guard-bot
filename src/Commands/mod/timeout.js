import { UserInputError } from "../../Utils/errors.js";
import { PermissionsBitField } from "discord.js";
import { resolveMember, assertTarget, duration, reasonText, auditReason, recordCase, report } from "../../Utils/command.js";
export const commandBase = {
  name: "timeout", aliases: ["sustur", "mute"], description: "Susturma uygular, kaldırır veya kalan süreyi gösterir; en fazla 28 gün.", perms: PermissionsBitField.Flags.ModerateMembers, cooldown: 3,
  async run(client, message, args) {
    const member = await resolveMember(message.guild, args[0]);
    if (!member) throw new UserInputError("Geçerli bir üye etiketi veya ID girin.");
    if (args[1] === "durum") return report(message, "Susturma durumu", [["Üye", member.user.tag], ["Bitiş", member.communicationDisabledUntilTimestamp > Date.now() ? "<t:" + Math.floor(member.communicationDisabledUntilTimestamp / 1000) + ":R>" : "Aktif susturma yok"]]);
    assertTarget(message, member, "moderatable");
    const remove = ["kaldır", "kaldir", "kapat"].includes(args[1]);
    const ms = remove ? null : duration(args[1]);
    if (!remove && !ms) throw new UserInputError("Süre 1s–28d arasında olmalı. Örnek: 1h30m. Kaldırmak için: timeout @üye kaldır");
    const reason = reasonText(args.slice(2));
    await member.timeout(ms, auditReason(message, reason));
    const id = await recordCase(message, remove ? "untimeout" : "timeout", member.id, reason, { durationMs: ms });
    return report(message, remove ? "Susturma kaldırıldı" : "Susturma uygulandı", [["Üye", member.user.tag], ["Süre", remove ? "Kaldırıldı" : ms / 60000 + " dakika"], ["Sebep", reason], ["Kayıt", id]]);
  },
};
