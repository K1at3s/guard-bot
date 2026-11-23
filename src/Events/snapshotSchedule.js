import { Events } from "discord.js";
import { takeSnapshot } from "../Utils/snapshot.js";

const HOURS = Math.min(Math.max(Number(process.env.SNAPSHOT_INTERVAL_HOURS) || 6, 1), 168);

export default {
  name: Events.ClientReady,
  once: true,
  roles: ["snapshot"],
  async execute(client) {
    const log = client.logger;
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
      for (const guild of client.guilds.cache.values()) {
        try {
          await takeSnapshot(guild, "otomatik", log);
        } catch (err) {
          log.error(`[Snapshot] otomatik yedek hatası (${guild.name}): ${err.message}`);
        }
      }
      } finally { running = false; }
    };
    log.info(`[Snapshot] otomatik yedek botu aktif (her ${HOURS} saatte bir).`);
    await run();
    const timer = setInterval(() => run().catch((err) => log.error(`[Snapshot] ${err.message}`)), HOURS * 60 * 60 * 1000);
    timer.unref();
  },
};
