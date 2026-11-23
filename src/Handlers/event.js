import { readdirSync } from "node:fs";
import config from "../Base/config.js";

export default {
  async execute(client) {
    const files = readdirSync("./src/Events");
    let n = 0;
    for (const file of files) {
      if (!file.endsWith(".js")) continue;
      const event = (await import(`../Events/${file}`)).default;
      if (!event?.name || !event?.execute) continue;
      // Görev dışı event bu botta çalışmaz
      if (config.role !== "all" && event.roles && !event.roles.includes(config.role)) continue;
      const names = Array.isArray(event.name) ? event.name : [event.name];
      for (const name of names) {
        const handler = (...args) => Promise.resolve().then(() => event.execute.call({ ...event, eventName: name, client }, ...args))
          .catch((err) => client.logger.error(`[Event:${name}] ${err.stack || err.message}`));
        if (event.once) client.once(name, handler);
        else client.on(name, handler);
        n++;
      }
    }
    client.logger.info(`${n} event dinleyicisi yüklendi (rol: ${config.role}).`);
  },
};
