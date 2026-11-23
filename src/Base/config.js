import dotenv from "dotenv";
dotenv.config();

// 3 ayrı bot, tek kod: node src/Base/app.js guard1|guard2|guard3|all
export const role = process.argv[2] || process.env.BOT_ROLE || "all";
if (!["guard1", "guard2", "guard3", "snapshot", "all"].includes(role)) throw new Error("BOT_ROLE geçersiz.");

const tokens = {
  guard1: process.env.BOT_TOKEN_1,
  guard2: process.env.BOT_TOKEN_2,
  guard3: process.env.BOT_TOKEN_3,
  snapshot: process.env.BOT_TOKEN_4,
};
const token = role === "all" ? process.env.BOT_TOKEN_1 : tokens[role];

if (!token) {
  console.error(`[Config] "${role}" rolü için token yok! .env dosyasına uygun BOT_TOKEN_* ekleyin.`);
  process.exit(1);
}

const owners = process.env.OWNER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [];
if (!owners.length) console.warn("[Config] UYARI: OWNER_IDS boş — sahip komutları kimse kullanamaz.");

// Görev dağılımı: her guard sistemi SADECE bir botta çalışır (çifte ceza olmaz)
export const DUTIES = {
  guard1: ["banGuard", "unbanGuard", "kickGuard", "timeoutGuard", "botGuard", "raidGuard"],
  guard2: ["channelGuard", "roleGuard", "memberRoleGuard", "emojiGuard", "stickerGuard"],
  guard3: ["webhookGuard", "serverGuard", "messageGuard", "ghostPing", "tagRole"],
  snapshot: ["snapshotSchedule"],
};
// Prefix komutlar SADECE guard3'te (3 bot aynı anda cevap vermesin)
export const COMMAND_ROLE = "guard3";

export default {
  role,
  token,
  prefix: process.env.PREFIX || ".",
  owners,
  mongoUri: process.env.MONGO_URI,
};
