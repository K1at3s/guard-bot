import { Events, EmbedBuilder, Colors, AuditLogEvent } from "discord.js";
import { settings, isExempt, punish, sendLog, logExempt, claimAudit, attempt, FRESH_MS } from "../Utils/guard.js";
const types = new Set([AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookUpdate, AuditLogEvent.WebhookDelete, AuditLogEvent.IntegrationCreate, AuditLogEvent.IntegrationUpdate, AuditLogEvent.IntegrationDelete]);
import { freshAudit } from "../Utils/audit.js";
export default {
  name: Events.GuildAuditLogEntryCreate, roles: ["guard3"],
  async execute(entry, guild) {
    if (!types.has(entry.action) || !guild || !entry.executor || !freshAudit(entry)) return;
    const data = await settings(guild.id);
    if (!data.guards.webhook.enabled || !claimAudit(guild.id, entry, "webhook")) return;
    if (isExempt(guild, entry.executor.id, data)) return logExempt(guild, "webhook", entry.executor.tag, "webhook/entegrasyon işlemi yaptı");
    const punishment = await punish(guild, entry.executor.id, data.guards.webhook.punish, "İzinsiz webhook/entegrasyon işlemi");
    let recovery = "Silinen webhook/entegrasyon geri oluşturulamaz";
    if ([AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookUpdate].includes(entry.action)) {
      recovery = await attempt(guild, "Webhook müdahale", async () => {
        const hooks = await guild.fetchWebhooks();
        const hook = hooks.get(entry.targetId ?? entry.target?.id);
        if (!hook) throw new Error("Hedef webhook bulunamadı");
        await hook.delete("Guard: izinsiz webhook işlemi");
      });
    } else if ([AuditLogEvent.IntegrationCreate, AuditLogEvent.IntegrationUpdate].includes(entry.action)) {
      recovery = await attempt(guild, "Entegrasyon müdahale", async () => {
        const integrations = await guild.fetchIntegrations();
        const integration = integrations.get(entry.targetId ?? entry.target?.id);
        if (!integration) throw new Error("Hedef entegrasyon bulunamadı");
        await integration.delete("Guard: izinsiz entegrasyon");
      });
    }
    const targetName = entry.target?.name ?? entry.target?.tag ?? entry.targetId ?? entry.target?.id ?? "—";
    await sendLog(guild, "webhook", new EmbedBuilder().setColor(Colors.Red).setTitle("Webhook / Entegrasyon Koruma")
      .addFields({ name: "Yetkili", value: `${entry.executor.tag} (\`${entry.executor.id}\`)` }, { name: "Hedef", value: String(targetName) },
        { name: "İşlem", value: String(entry.action), inline: true }, { name: "Ceza", value: punishment, inline: true }, { name: "Müdahale", value: recovery }).setTimestamp());
  },
};
