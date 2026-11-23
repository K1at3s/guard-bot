import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import config from "./config.js";
import mongoose from "mongoose";

const client = new Client({
  allowedMentions: { parse: [], repliedUser: false },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember, Partials.User, Partials.Channel, Partials.Message],
  presence: {
    activities: [{ name: `${config.prefix}yardım • ${config.role}`, type: ActivityType.Watching }],
    status: "online",
  },
});
client.role = config.role;

for (const h of ["logger", "command", "event"]) {
  await (await import(`../Handlers/${h}.js`)).default.execute(client);
}

let stopping = false;
async function stop(exitCode, reason) {
  if (stopping) return;
  stopping = true;
  if (reason) client.logger.error(`Beklenmeyen hata: ${reason?.stack || reason?.message || reason}`);
  // Belirsiz hata sonrası koruma süreci çalışmaya devam etmez.
  const deadline = setTimeout(() => process.exit(exitCode), 5000);
  deadline.unref();
  try { client.destroy(); await mongoose.disconnect(); }
  finally { process.exit(exitCode); }
}
for (const event of ["unhandledRejection", "uncaughtException"]) process.once(event, (err) => { void stop(1, err); });
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void stop(0); });

try {
  if (!config.mongoUri) throw new Error("MONGO_URI tanımlanmalı.");
  mongoose.set("strictQuery", false);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  client.logger.info("MongoDB bağlantısı kuruldu.");
  await client.login(config.token);
} catch (err) {
  client.logger.error(`Başlatma başarısız: ${err.message}`);
  client.destroy();
  await mongoose.disconnect();
  process.exitCode = 1;
}

