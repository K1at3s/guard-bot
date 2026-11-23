import { Events } from "discord.js";

export default {
  name: [Events.Error, Events.Warn, Events.ShardDisconnect, Events.ShardReconnecting, Events.ShardResume],
  async execute(value, shardId) {
    const logger = this.client.logger;
    if (this.eventName === Events.Error) logger.error(`[Discord bağlantısı] ${value?.message || value}`);
    else if (this.eventName === Events.Warn) logger.warn(`[Discord uyarısı] ${value}`);
    else if (this.eventName === Events.ShardDisconnect) logger.warn(`[Discord bağlantısı] Shard ${shardId} koptu • kod ${value?.code ?? "—"}`);
    else logger.info(`[Discord bağlantısı] ${this.eventName} • shard ${value}`);
  },
};
