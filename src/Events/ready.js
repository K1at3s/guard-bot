import { Events } from "discord.js";
import config from "../Base/config.js";
import Guild from "../Database/schemas/Guild.js";
import { registerSlashCommands } from "../Utils/slash.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.logger.info(`${client.user.tag} aktif! (rol: ${config.role})`);
    const heartbeat = async () => {
      if (!client.isReady()) return;
      for (const guild of client.guilds.cache.values()) {
        await Guild.updateOne({ guildId: guild.id }, {
          $addToSet: { guardBots: client.user.id },
          $set: { [`services.${client.role}`]: { userId: client.user.id, lastSeen: new Date() } },
        }, { upsert: true });
      }
    };
    await heartbeat();
    const timer = setInterval(() => heartbeat().catch((err) => client.logger.error(`[Durum sinyali] ${err.message}`)), 60000);
    timer.unref();
    registerSlashCommands(client).catch((err) => client.logger.error(`[Slash] kayıt başarısız: ${err.message}`));
  },
};
