export function redactSecrets(value) {
  if (typeof value === "string") {
    let text = value.replace(/[\w-]{20,}\.[\w-]{6,}\.[\w-]{25,}/g, "[GİZLİ]")
      .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[GİZLİ]");
    for (const name of ["BOT_TOKEN_1", "BOT_TOKEN_2", "BOT_TOKEN_3", "BOT_TOKEN_4", "MONGO_URI"]) {
      const secret = process.env[name];
      if (secret) text = text.split(secret).join("[GİZLİ]");
    }
    return text.replace(/[\u001b\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, redactSecrets(val)]));
  return value;
}
