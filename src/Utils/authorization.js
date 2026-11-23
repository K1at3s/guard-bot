import config from "../Base/config.js";
import { isExempt } from "./guard.js";
import { UserInputError } from "./errors.js";
import { DANGEROUS_PERMISSIONS } from "./security.js";

const READ_ONLY = {
  guard: new Set([undefined, "liste", "bilgi"]),
  settings: new Set([undefined, "politikalar"]),
  setup: new Set(["kontrol"]),
  panik: new Set([undefined, "durum"]),
  karantina: new Set([undefined, "durum", "listele"]),
  "tag-rol": new Set([undefined, "durum"]),
  "komut-kanal": new Set([undefined, "liste"]),
  snapshot: new Set([undefined, "liste", "incele"]),
};

export function canRunCommand(command, member, guild, data, args = []) {
  const userId = member.id;
  if (command.ownerOnly && !config.owners.includes(userId)) return false;
  if (command.perms && !member.permissions.has(command.perms)) return false;
  if (command.trustedOnly && !READ_ONLY[command.name]?.has(args[0]) && !isExempt(guild, userId, data)) return false;
  return true;
}

// Rol, kanal bazlı yönetim yetkileri de dahil otomatik dağıtıma uygun olmalı.
export function assertAutomationRole(guild, role, forbiddenRoleId) {
  if (!role || role.id === guild.id || role.id === forbiddenRoleId || role.managed || !role.editable || role.permissions.bitfield !== 0n) {
    throw new UserInputError("Rol yetkisiz, yönetilebilir, diğer otomasyon rolünden farklı ve botun altında olmalı.");
  }
  for (const channel of guild.channels.cache.values()) {
    const overwrite = channel.permissionOverwrites?.cache.get(role.id);
    if (overwrite?.allow.any(DANGEROUS_PERMISSIONS)) throw new UserInputError("Rolün kanal bazında yönetim izni var; otomasyon rolü olarak kullanılamaz.");
  }
}
