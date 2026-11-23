import { PermissionsBitField } from "discord.js";

const PRIVILEGED = new Set(["Administrator", "BanMembers", "KickMembers", "ModerateMembers", "MentionEveryone", "MuteMembers", "DeafenMembers", "MoveMembers", "ViewAuditLog"]);
export const DANGEROUS_PERMISSIONS = Object.entries(PermissionsBitField.Flags)
  .filter(([name]) => name.startsWith("Manage") || PRIVILEGED.has(name)).map(([, bit]) => bit);
