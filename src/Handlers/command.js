import { Collection } from "discord.js";
import { readdirSync } from "node:fs";
import config, { COMMAND_ROLE } from "../Base/config.js";
import { commandCatalog } from "../Utils/commandCatalog.js";

export default {
  async execute(client) {
    // Prefix komutlar SADECE komut botunda yüklenir
    if (config.role !== "all" && config.role !== COMMAND_ROLE) {
      client.commands = new Collection();
      return;
    }
    client.commands = new Collection();
    client.commandAliases = new Collection();

    const folders = readdirSync("./src/Commands");
    for (const category of folders) {
      const files = readdirSync(`./src/Commands/${category}`);
      for (const file of files) {
        if (!file.endsWith(".js")) continue;
        const mod = await import(`../Commands/${category}/${file}`);
        const cmd = mod.commandBase;
        if (!cmd?.name) continue;
        Object.assign(cmd, { category, ...commandCatalog[cmd.name] });
        if (client.commands.has(cmd.name)) throw new Error(`Tekrarlanan komut: ${cmd.name}`);
        client.commands.set(cmd.name, cmd);
        for (const alias of cmd.aliases || []) client.commandAliases.set(alias, cmd.name);
      }
    }
    client.logger.info(`${client.commands.size} komut yüklendi.`);
  },
};
