import mongoose from "mongoose";
import { report } from "../../Utils/command.js";
export const commandBase = {
  name: "ping", aliases: ["pong"], description: "Gateway, mesaj, veritabanı gecikmesini ve sistem durumunu ölçer.", cooldown: 5,
  async run(client, message) {
    const started = performance.now();
    const status = await message.channel.send("🏓 Ölçülüyor...");
    const messageMs = Math.round(performance.now() - started);
    let database = "Bağlı değil";
    if (mongoose.connection.readyState === 1) {
      const dbStart = performance.now();
      try { await mongoose.connection.db.admin().ping(); database = Math.round(performance.now() - dbStart) + " ms"; }
      catch { database = "Ölçüm başarısız"; }
    }
    const memory = Math.round(process.memoryUsage().rss / 1048576);
    return status.edit("🏓 Gateway: " + (client.ws.ping < 0 ? "Ölçülmedi" : client.ws.ping + " ms") + " | Mesaj: " + messageMs + " ms | Veritabanı: " + database + "\nGörev: " + client.role + " • Çalışma: " + Math.floor(process.uptime() / 60) + " dk • Bellek: " + memory + " MB");
  },
};
