import { SlashCommandBuilder, REST, Routes, PermissionsBitField } from "discord.js";
import config, { COMMAND_ROLE } from "../Base/config.js";
import { resolveLocale } from "./i18n.js";

const GUARD_SYSTEMS = [["ban","Ban"],["kick","Kick"],["bot","Bot"],["raid","Raid"],["channel","Kanal"],["role","Rol"],["emoji","Emoji"],["sticker","Sticker"],["webhook","Webhook"],["server","Sunucu"],["message","Mesaj"],["tag","Tag"],["timeout","Timeout"]];
const PUNISH = [["quarantine","Karantina"],["kick","Kick"],["ban","Ban"]];
const LIMIT_TYPES = [["ban","Ban"],["kick","Kick"],["joins","Katılım"],["timeout","Susturma"]];
const PROFILES = [["dengeli","Dengeli"],["sıkı","Sıkı"]];
const LOG_SYSTEMS = [...GUARD_SYSTEMS, ["mod","Mod"]];

const CHOICE_TR = {Ban:"Yasak",Kick:"Atma",Bot:"Bot",Raid:"Raid",Kanal:"Kanal",Rol:"Rol",Emoji:"Emoji",Sticker:"Çıkartma",Webhook:"Webhook",Sunucu:"Sunucu",Mesaj:"Mesaj",Tag:"Etiket",Timeout:"Zaman aşımı","Karantina":"Karantina","Katılım":"Katılım","Susturma":"Susturma","Dengeli":"Dengeli","Sıkı":"Sıkı","Tümü":"Tümü","Mod":"Mod","Detay":"Detay"};
const choices = (arr) => (o) => o.addChoices(...arr.map(([value, name]) => {
  const tr = CHOICE_TR[name] ?? name;
  const en = name;
  return { name: en, value, name_localizations: locMap(en, tr) };
}));

const ALL_LOCALES = ['id','da','de','en-GB','en-US','es-ES','es-419','fr','hr','it','lt','hu','nl','no','pl','pt-BR','ro','fi','sv-SE','vi','tr','cs','el','bg','ru','uk','hi','th','zh-CN','ja','zh-TW','ko'];
const locMap = (en, tr) => Object.fromEntries(ALL_LOCALES.map((l) => [l, l === 'tr' ? tr : en]));
const OPT_LOC = {
  uye:{tr:"uye","en-US":"member","en-GB":"member"}, member:{tr:"uye","en-US":"member","en-GB":"member"},
  sebep:{tr:"sebep","en-US":"reason","en-GB":"reason"}, reason:{tr:"sebep","en-US":"reason","en-GB":"reason"},
  sil:{tr:"sil","en-US":"delete-days","en-GB":"delete-days"},
  sure:{tr:"sure","en-US":"duration","en-GB":"duration"}, duration:{tr:"sure","en-US":"duration","en-GB":"duration"},
  id:{tr:"id","en-US":"id","en-GB":"id"},
  kanal:{tr:"kanal","en-US":"channel","en-GB":"channel"}, channel:{tr:"kanal","en-US":"channel","en-GB":"channel"},
  rol:{tr:"rol","en-US":"role","en-GB":"role"}, role:{tr:"rol","en-US":"role","en-GB":"role"},
  sayfa:{tr:"sayfa","en-US":"page","en-GB":"page"}, page:{tr:"sayfa","en-US":"page","en-GB":"page"},
  kayit:{tr:"kayit","en-US":"record","en-GB":"record"}, record:{tr:"kayit","en-US":"record","en-GB":"record"},
  onay:{tr:"onay","en-US":"confirm","en-GB":"confirm"}, confirm:{tr:"onay","en-US":"confirm","en-GB":"confirm"},
  sistem:{tr:"sistem","en-US":"system","en-GB":"system"}, system:{tr:"sistem","en-US":"system","en-GB":"system"},
  mod:{tr:"mod","en-US":"mode","en-GB":"mode"}, mode:{tr:"mod","en-US":"mode","en-GB":"mode"},
  tur:{tr:"tur","en-US":"type","en-GB":"type"}, type:{tr:"tur","en-US":"type","en-GB":"type"},
  sayi:{tr:"sayi","en-US":"number","en-GB":"number"}, number:{tr:"sayi","en-US":"number","en-GB":"number"},
  ad:{tr:"ad","en-US":"name","en-GB":"name"}, name:{tr:"ad","en-US":"name","en-GB":"name"},
  ayar:{tr:"ayar","en-US":"setting","en-GB":"setting"}, setting:{tr:"ayar","en-US":"setting","en-GB":"setting"},
  deger:{tr:"deger","en-US":"value","en-GB":"value"}, value:{tr:"deger","en-US":"value","en-GB":"value"},
  esik:{tr:"esik","en-US":"threshold","en-GB":"threshold"}, threshold:{tr:"esik","en-US":"threshold","en-GB":"threshold"},
  sira:{tr:"sira","en-US":"index","en-GB":"index"}, index:{tr:"sira","en-US":"index","en-GB":"index"},
  komut:{tr:"komut","en-US":"command","en-GB":"command"}, command:{tr:"komut","en-US":"command","en-GB":"command"},
  limit:{tr:"limit","en-US":"limit","en-GB":"limit"},
};
const OPT_NAMES = {
  uye:["uye","member"], sebep:["sebep","reason"], sil:["sil","delete-days"], sure:["sure","duration"], id:["id","id"],
  kanal:["kanal","channel"], rol:["rol","role"], sayfa:["sayfa","page"], kayit:["kayit","record"], onay:["onay","confirm"],
  sistem:["sistem","system"], mod:["mod","mode"], tur:["tur","type"], sayi:["sayi","number"], ad:["ad","name"],
  ayar:["ayar","setting"], deger:["deger","value"], esik:["esik","threshold"], sira:["sira","index"], komut:["komut","command"], limit:["limit","limit"]
};
const S = (o, type, name, desc, req = true, extra, loc) => {
  const m = { string:"addStringOption", integer:"addIntegerOption", user:"addUserOption", channel:"addChannelOption", role:"addRoleOption", bool:"addBooleanOption", attachment:"addAttachmentOption" };
  o[m[type]]((x) => {
    const pair = OPT_NAMES[name] || [name,name];
    const trName = loc?.tr ?? pair[0];
    const enName = loc?.en ?? pair[1];
    x.setName(name).setDescription(String(loc?.descEn ?? desc).slice(0,100)).setRequired(req);
    x.setNameLocalizations(locMap(enName, trName));
    x.setDescriptionLocalizations(locMap(String(loc?.descEn ?? desc).slice(0,100), String(loc?.descTr ?? desc).slice(0,100)));
    extra?.(x);
    return x;
  });
  return o;
};

function defs() {
  return [
    { name:"ban", tr:"yasakla", desc:"Üyeyi yasaklar / Ban a member", perms:PermissionsBitField.Flags.BanMembers,
      build:(s)=>{ S(s,"user","uye","Üye / Member"); S(s,"string","sebep","Sebep / Reason",false); S(s,"integer","sil","Mesaj silme günü 0-7 / Delete days",false,(o)=>o.setMinValue(0).setMaxValue(7)); },
      toArgs:(i)=>[i.options.getUser("uye")?.id, i.options.getString("sebep")??"", i.options.getInteger("sil")!=null?`--sil=${i.options.getInteger("sil")}`:""].filter(Boolean) },
    { name:"kick", tr:"at", desc:"Üyeyi atar / Kick a member", perms:PermissionsBitField.Flags.KickMembers,
      build:(s)=>{ S(s,"user","uye","Üye / Member"); S(s,"string","sebep","Sebep / Reason",false); },
      toArgs:(i)=>[i.options.getUser("uye")?.id, i.options.getString("sebep")??""].filter(Boolean) },
    { name:"timeout", tr:"sustur", desc:"Üyeyi susturur / Timeout a member", perms:PermissionsBitField.Flags.ModerateMembers,
      build:(s)=>{ S(s,"user","uye","Üye / Member"); S(s,"string","sure","Süre/kaldır/durum / Duration|remove|status"); S(s,"string","sebep","Sebep / Reason",false); },
      toArgs:(i)=>[i.options.getUser("uye")?.id, i.options.getString("sure"), i.options.getString("sebep")??""].filter(Boolean) },
    { name:"unban", tr:"yasak-kaldir", desc:"Yasağı kaldırır / Unban a user", perms:PermissionsBitField.Flags.BanMembers,
      build:(s)=>{ S(s,"string","id","Kullanıcı ID / User ID"); S(s,"string","sebep","Sebep / Reason",false); },
      toArgs:(i)=>[i.options.getString("id"), i.options.getString("sebep")??""].filter(Boolean) },
    { name:"uyar", tr:"warn", desc:"Uyarı sistemi / Warning system", perms:PermissionsBitField.Flags.ModerateMembers,
      subs:[
        { name:"ekle", tr:"add", desc:"Uyarı ekle / Add warning", build:(s)=>{ S(s,"user","uye","Üye / Member"); S(s,"string","sebep","Sebep / Reason",false); }, toArgs:(i)=>[i.options.getUser("uye")?.id, i.options.getString("sebep")??""].filter(Boolean) },
        { name:"liste", tr:"list", desc:"Uyarıları listele / List warnings", build:(s)=>{ S(s,"user","uye","Üye / Member",false); S(s,"integer","sayfa","Sayfa / Page",false); }, toArgs:(i)=>["liste", i.options.getUser("uye")?.id??"", String(i.options.getInteger("sayfa")??"")].filter(Boolean) },
        { name:"sil", tr:"delete", desc:"Uyarı sil / Delete warning", build:(s)=>{ S(s,"string","kayit","Kayıt ID / Record ID"); }, toArgs:(i)=>["sil", i.options.getString("kayit")] },
        { name:"temizle", tr:"clear", desc:"Uyarıları temizle / Clear warnings", build:(s)=>{ S(s,"user","uye","Üye / Member"); }, toArgs:(i)=>["temizle", i.options.getUser("uye")?.id] },
      ]},
    { name:"lock", tr:"kilit", desc:"Kanal kilidi / Channel lock", perms:PermissionsBitField.Flags.ManageChannels,
      subs:[
        { name:"kapat", tr:"close", desc:"Kanalı kilitle / Lock channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel",false); S(s,"string","sebep","Sebep / Reason",false); }, toArgs:(i)=>["kapat", i.options.getChannel("kanal")?.id??"", i.options.getString("sebep")??""].filter(Boolean) },
        { name:"aç", tr:"open", desc:"Kilidi aç / Unlock channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel",false); }, toArgs:(i)=>["aç", i.options.getChannel("kanal")?.id??""].filter(Boolean) },
        { name:"durum", tr:"status", desc:"Kilit durumu / Lock status", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel",false); }, toArgs:(i)=>["durum", i.options.getChannel("kanal")?.id??""].filter(Boolean) },
      ]},
    { name:"panik", tr:"panic", desc:"Panik modu / Panic mode",
      subs:[
        { name:"aç", tr:"open", desc:"Panik aç / Enable panic", build:(s)=>{ S(s,"string","sure","Süre 1m..1h / Duration",false); }, toArgs:(i)=>["aç", i.options.getString("sure")??""].filter(Boolean) },
        { name:"kapat", tr:"close", desc:"Panik kapat / Disable panic", build:()=>{}, toArgs:()=>["kapat"] },
        { name:"durum", tr:"status", desc:"Panik durumu / Panic status", build:()=>{}, toArgs:()=>["durum"] },
      ]},
    { name:"kurtar", tr:"recovery", desc:"Ban kurtarma / Ban recovery", perms:PermissionsBitField.Flags.BanMembers,
      subs:[
        { name:"liste", tr:"list", desc:"Banları listele / List bans", build:(s)=>{ S(s,"integer","sayfa","Sayfa / Page",false); }, toArgs:(i)=>["liste", String(i.options.getInteger("sayfa")??"")].filter(Boolean) },
        { name:"uygula", tr:"apply", desc:"Banları kaldır / Remove bans", build:(s)=>{ S(s,"string","onay","ONAY yazın / Type ONAY"); S(s,"integer","limit","En fazla 100 / Max 100",false); }, toArgs:(i)=>["uygula", i.options.getString("onay"), String(i.options.getInteger("limit")??"")].filter(Boolean) },
      ]},
    { name:"snapshot", tr:"yedek", desc:"Sunucu yedeği / Server snapshot", perms:PermissionsBitField.Flags.ManageChannels,
      subs:[
        { name:"al", tr:"take", desc:"Yedek al / Take snapshot", build:()=>{}, toArgs:()=>["al"] },
        { name:"liste", tr:"list", desc:"Yedekleri listele / List snapshots", build:()=>{}, toArgs:()=>["liste"] },
        { name:"incele", tr:"inspect", desc:"Yedeği incele / Inspect snapshot", build:(s)=>{ S(s,"integer","sira","Sıra / Index"); }, toArgs:(i)=>["incele", String(i.options.getInteger("sira"))] },
        { name:"yükle", tr:"load", desc:"Yedeği yükle / Load snapshot", build:(s)=>{ S(s,"integer","sira","Sıra / Index"); S(s,"string","onay","ONAY yazın / Type ONAY"); }, toArgs:(i)=>["yükle", String(i.options.getInteger("sira")), i.options.getString("onay")] },
      ]},
    { name:"guard", tr:"koruma", desc:"Guard sistemleri / Guard systems", perms:PermissionsBitField.Flags.ManageGuild,
      subs:[
        { name:"liste", tr:"list", desc:"Guard durumu / Guard status", build:()=>{}, toArgs:()=>["liste"] },
        { name:"bilgi", tr:"info", desc:"Sistem bilgisi / System info", build:(s)=>{ S(s,"string","sistem","Sistem / System",true,choices(GUARD_SYSTEMS)); }, toArgs:(i)=>["bilgi", i.options.getString("sistem")] },
        { name:"aç", tr:"open", desc:"Sistemi aç / Enable system", build:(s)=>{ S(s,"string","sistem","Sistem veya tümü / System or all",true,choices([...GUARD_SYSTEMS,["tümü","Tümü"]])); }, toArgs:(i)=>["aç", i.options.getString("sistem")] },
        { name:"kapat", tr:"close", desc:"Sistemi kapat / Disable system", build:(s)=>{ S(s,"string","sistem","Sistem veya tümü / System or all",true,choices([...GUARD_SYSTEMS,["tümü","Tümü"]])); }, toArgs:(i)=>["kapat", i.options.getString("sistem")] },
        { name:"ceza", tr:"punish", desc:"Ceza ayarla / Set punishment", build:(s)=>{ S(s,"string","sistem","Sistem / System",true,choices(GUARD_SYSTEMS)); S(s,"string","mod","Ceza / Punishment",true,choices(PUNISH)); }, toArgs:(i)=>["ceza", i.options.getString("sistem"), i.options.getString("mod")] },
        { name:"limit", tr:"limit", desc:"Limit ayarla / Set limit", build:(s)=>{ S(s,"string","tur","Tür / Type",true,choices(LIMIT_TYPES)); S(s,"integer","sayi","Sayı 1-100 / Number",true,(o)=>o.setMinValue(1).setMaxValue(100)); }, toArgs:(i)=>["limit", i.options.getString("tur"), String(i.options.getInteger("sayi"))] },
        { name:"profil", tr:"profile", desc:"Profil uygula / Apply profile", build:(s)=>{ S(s,"string","ad","Profil / Profile",true,choices(PROFILES)); }, toArgs:(i)=>["profil", i.options.getString("ad")] },
      ]},
    { name:"settings", tr:"ayarlar", desc:"Ayarlar / Settings", perms:PermissionsBitField.Flags.ManageGuild,
      subs:[
        { name:"görüntüle", tr:"view", desc:"Ayarları göster / Show settings", build:()=>{}, toArgs:()=>[] },
        { name:"log", tr:"log", desc:"Log kanalı ayarla / Set log channel", build:(s)=>{ S(s,"string","sistem","Sistem / System",true,choices(LOG_SYSTEMS)); S(s,"channel","kanal","Kanal / Channel"); }, toArgs:(i)=>["log", i.options.getString("sistem"), i.options.getChannel("kanal")?.id] },
        { name:"mesaj", tr:"message", desc:"Mesaj politikası / Message policy", build:(s)=>{ S(s,"string","ayar","Ayar / Setting"); S(s,"string","deger","Değer / Value"); }, toArgs:(i)=>["mesaj", i.options.getString("ayar"), i.options.getString("deger")] },
        { name:"raid", tr:"raid", desc:"Raid politikası / Raid policy", build:(s)=>{ S(s,"string","ayar","Ayar / Setting"); S(s,"string","deger","Değer / Value"); }, toArgs:(i)=>["raid", i.options.getString("ayar"), i.options.getString("deger")] },
        { name:"uyari", tr:"warning", desc:"Uyarı politikası / Warning policy", build:(s)=>{ S(s,"integer","esik","Eşik 1-20 / Threshold",true,(o)=>o.setMinValue(1).setMaxValue(20)); S(s,"string","sure","Süre / Duration"); }, toArgs:(i)=>["uyarı", String(i.options.getInteger("esik")), i.options.getString("sure")] },
        { name:"politikalar", tr:"policies", desc:"Politikaları göster / Show policies", build:()=>{}, toArgs:()=>["politikalar"] },
      ]},
    { name:"setup", tr:"kurulum", desc:"Kurulum / Setup", perms:PermissionsBitField.Flags.ManageChannels,
      subs:[
        { name:"kontrol", tr:"check", desc:"Kurulumu kontrol et / Check setup", build:()=>{}, toArgs:()=>["kontrol"] },
        { name:"onar", tr:"repair", desc:"Log kanallarını onar / Repair logs", build:()=>{}, toArgs:()=>["onar"] },
        { name:"kur", tr:"install", desc:"Kurulumu yap / Install setup", build:()=>{}, toArgs:()=>["kur"] },
      ]},
    { name:"komut-kanal", tr:"command-channel", desc:"Komut kanalları / Command channels", perms:PermissionsBitField.Flags.ManageGuild,
      subs:[
        { name:"liste", tr:"list", desc:"Listele / List", build:(s)=>{ S(s,"integer","sayfa","Sayfa / Page",false); }, toArgs:(i)=>["liste", String(i.options.getInteger("sayfa")??"")].filter(Boolean) },
        { name:"sadece", tr:"only", desc:"Sadece bu kanal / Only this channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel"); }, toArgs:(i)=>["sadece", i.options.getChannel("kanal")?.id] },
        { name:"ekle", tr:"add", desc:"Kanal ekle / Add channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel"); }, toArgs:(i)=>["sadece", i.options.getChannel("kanal")?.id] },
        { name:"çıkar", tr:"remove", desc:"Kanal çıkar / Remove channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel"); }, toArgs:(i)=>["çıkar", i.options.getChannel("kanal")?.id] },
        { name:"aç", tr:"open", desc:"Kanalı aç / Enable channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel"); }, toArgs:(i)=>["aç", i.options.getChannel("kanal")?.id] },
        { name:"kapat", tr:"close", desc:"Kanalı kapat / Disable channel", build:(s)=>{ S(s,"channel","kanal","Kanal / Channel"); }, toArgs:(i)=>["kapat", i.options.getChannel("kanal")?.id] },
        { name:"her-yer", tr:"everywhere", desc:"Her yerde aç / Allow everywhere", build:()=>{}, toArgs:()=>["her-yer"] },
      ]},
    { name:"güvenli-liste", tr:"safelist", desc:"Güvenli liste / Safelist", perms:PermissionsBitField.Flags.Administrator,
      subs:[
        { name:"panel", tr:"panel", desc:"Paneli aç / Open panel", build:()=>{}, toArgs:()=>[] },
        { name:"ekle", tr:"add", desc:"Ekle / Add", build:(s)=>{ S(s,"user","uye","Üye / Member"); }, toArgs:(i)=>["ekle", i.options.getUser("uye")?.id] },
        { name:"kaldır", tr:"remove", desc:"Kaldır / Remove", build:(s)=>{ S(s,"user","uye","Üye / Member"); }, toArgs:(i)=>["kaldır", i.options.getUser("uye")?.id] },
        { name:"liste", tr:"list", desc:"Listele / List", build:(s)=>{ S(s,"integer","sayfa","Sayfa / Page",false); }, toArgs:(i)=>["liste", String(i.options.getInteger("sayfa")??"")].filter(Boolean) },
        { name:"kontrol", tr:"check", desc:"Kontrol et / Check", build:(s)=>{ S(s,"user","uye","Üye / Member"); }, toArgs:(i)=>["kontrol", i.options.getUser("uye")?.id] },
      ]},
    { name:"karantina", tr:"quarantine", desc:"Karantina yönetimi / Quarantine management", perms:PermissionsBitField.Flags.ManageGuild,
      subs:[
        { name:"ayarla", tr:"set", desc:"Karantina rolü ayarla / Set quarantine role", build:(s)=>{ S(s,"role","rol","Rol / Role"); }, toArgs:(i)=>[i.options.getRole("rol")?.id] },
        { name:"durum", tr:"status", desc:"Durum / Status", build:()=>{}, toArgs:()=>["durum"] },
        { name:"kapat", tr:"close", desc:"Kapat / Disable", build:()=>{}, toArgs:()=>["kapat"] },
        { name:"listele", tr:"list", desc:"Listele / List", build:(s)=>{ S(s,"integer","sayfa","Sayfa / Page",false); }, toArgs:(i)=>["listele", String(i.options.getInteger("sayfa")??"")].filter(Boolean) },
        { name:"bırak", tr:"release", desc:"Bırak / Release", build:(s)=>{ S(s,"user","uye","Üye / Member"); }, toArgs:(i)=>["bırak", i.options.getUser("uye")?.id] },
      ]},
    { name:"tag-rol", tr:"tag-role", desc:"Tag rolü / Tag role", perms:PermissionsBitField.Flags.ManageGuild,
      subs:[
        { name:"aç", tr:"open", desc:"Aç / Enable", build:(s)=>{ S(s,"role","rol","Rol / Role"); }, toArgs:(i)=>["aç", i.options.getRole("rol")?.id] },
        { name:"kapat", tr:"close", desc:"Kapat / Disable", build:()=>{}, toArgs:()=>["kapat"] },
        { name:"durum", tr:"status", desc:"Durum / Status", build:()=>{}, toArgs:()=>["durum"] },
        { name:"eşitle", tr:"sync", desc:"Eşitle / Sync", build:()=>{}, toArgs:()=>["eşitle"] },
      ]},
    { name:"say", tr:"count", desc:"Sunucu istatistikleri / Server stats",
      build:(s)=>{ S(s,"string","mod","Mod / Mode",false,choices([["detay","Detay"]])); }, toArgs:(i)=>[i.options.getString("mod")??""].filter(Boolean) },
    { name:"ping", tr:"ping", desc:"Gecikme / Latency", build:()=>{}, toArgs:()=>[] },
    { name:"kontrol", tr:"check", desc:"Sistem kontrolü / System check", build:()=>{}, toArgs:()=>[] },
    { name:"yardım", tr:"help", desc:"Yardım / Help", build:(s)=>{ S(s,"string","komut","Komut veya kategori / Command or category",false); }, toArgs:(i)=>[i.options.getString("komut")??""].filter(Boolean) },
    { name:"kapat", tr:"shutdown", desc:"Botu kapat / Shutdown bot",
      build:(s)=>{ S(s,"string","onay","durum veya ONAY / status or ONAY",false); }, toArgs:(i)=>[i.options.getString("onay")??""].filter(Boolean) },
    { name:"sicil", tr:"record", desc:"Sicil / Moderation record",
      build:(s)=>{ S(s,"user","uye","Üye / Member"); S(s,"integer","sayfa","Sayfa / Page",false); }, toArgs:(i)=>[i.options.getUser("uye")?.id, String(i.options.getInteger("sayfa")??"")].filter(Boolean) },
  ];
}

export function slashDefs() { return defs(); }

function enTr(d){
  const a=d.name, b=d.tr;
  const trRe=/[çğıöşüİĞÖŞÜÇ]|yardım|ayarlar|yasakla|sustur|uyar|kilit|panik|kurtar|yedek|koruma|kurulum|güvenli-liste|karantina|sicil/;
  const aTr=trRe.test(a), bTr=trRe.test(b);
  if(aTr && !bTr) return {en:b,tr:a};
  if(!aTr && bTr) return {en:a,tr:b};
  return {en:a,tr:b};
}

export function buildSlashCommands() {
  const out = [];
  for (const d of defs()) {
    const {en,tr} = enTr(d);
    const b = new SlashCommandBuilder().setName(en).setDescription((d.descEn ?? d.desc).slice(0, 100));
    b.setNameLocalizations(locMap(en, tr));
    b.setDescriptionLocalizations(locMap((d.descEn ?? d.desc).slice(0,100), (d.descTr ?? d.desc).slice(0,100)));
    if (d.perms) b.setDefaultMemberPermissions(d.perms);
    if (d.subs) {
      for (const sub of d.subs) {
        b.addSubcommand((sc) => {
          const enN = sub.en ?? (/[çğıöşüİĞÖŞÜÇ]/.test(sub.tr||"") ? sub.name : (sub.tr || sub.name));
          const trN = sub.trName ?? (/[çğıöşüİĞÖŞÜÇ]/.test(sub.name) ? sub.name : (/[çğıöşüİĞÖŞÜÇ]/.test(sub.tr||"") ? sub.tr : sub.name));
          sc.setName(enN).setDescription((sub.descEn ?? sub.desc).slice(0,100));
          sc.setNameLocalizations(locMap(enN, trN));
          sc.setDescriptionLocalizations(locMap((sub.descEn ?? sub.desc).slice(0,100), (sub.descTr ?? sub.desc).slice(0,100)));
          sub.build?.(sc);
          return sc;
        });
      }
    } else {
      d.build?.(b);
    }
    out.push({ json: b.toJSON(), commandName: d.name, aliasName: en });
  }
  return out;
}

export function resolveSlashDef(interaction) {
  const name = interaction.commandName;
  return defs().find((d) => d.name === name || d.tr === name) ?? null;
}

export function slashToArgs(interaction, def) {
  if (!def) return [];
  if (def.subs) {
    let sub;
    try { sub = interaction.options.getSubcommand(); } catch { sub = null; }
    const found = def.subs.find((s) => s.name === sub || s.tr === sub) ?? def.subs.find((s) => s.name === sub);
    if (!found) return sub ? [sub] : [];
    return found.toArgs(interaction).filter((x) => x !== "" && x != null);
  }
  return (def.toArgs?.(interaction) ?? []).filter((x) => x !== "" && x != null);
}

export async function registerSlashCommands(client) {
  if (config.role !== "all" && config.role !== COMMAND_ROLE) return;
  const cmds = buildSlashCommands().map((c) => c.json);
  const rest = new REST({ version: "10" }).setToken(client.token ?? config.token);
  await rest.put(Routes.applicationCommands(client.user.id), { body: cmds });
  client.logger.info(`${cmds.length} slash komut kaydedildi.`);
}

export function wrapInteraction(interaction) {
  const reply = async (payload) => {
    const p = normalize(payload);
    if (interaction.deferred && !interaction.replied) return interaction.editReply(p);
    if (interaction.replied) return interaction.followUp(p);
    return interaction.reply(p);
  };
  const channel = Object.create(interaction.channel ?? {});
  channel.send = (payload) => reply(payload);
  const locale = resolveLocale(interaction.locale ?? interaction.guildLocale ?? interaction.guild?.preferredLocale);
  return {
    client: interaction.client,
    guild: interaction.guild,
    channel,
    member: interaction.member,
    author: interaction.user,
    user: interaction.user,
    content: "",
    locale,
    isTurkish: locale === "tr",
    interaction,
    reply,
    editReply: (p) => interaction.deferred || interaction.replied ? interaction.editReply(normalize(p)) : interaction.reply(normalize(p)),
  };
}

function normalize(payload) {
  if (typeof payload === "string") return { content: payload, allowedMentions: { parse: [] } };
  if (payload?.flags) return { allowedMentions: { parse: [] }, ...payload };
  return { allowedMentions: { parse: [] }, ...payload };
}
