# Guard Bot

[Türkçe](#türkçe) | [English](#english)

---

## Türkçe

Discord sunucusu için görev paylaşan koruma ve moderasyon botu.

## Görevler ve kurulum

| Görev | Sorumluluk |
| --- | --- |
| `guard1` | Ban, unban, kick, timeout, bot ve raid koruması |
| `guard2` | Kanal, rol, üye rolü, emoji ve sticker koruması |
| `guard3` | Sunucu, webhook, entegrasyon, mesaj, tag ve prefix komutları |
| `snapshot` | Otomatik yapı yedekleri |
| `all` | Tek botta bütün görevler |

Güncel güvenlik yamalarını içeren Node.js 22 veya 24 LTS gerekir; mevcut başlatma komutları Bun kullanır. Bağımlılıkları `bun install` ile kurun. `.env` içinde `BOT_TOKEN_1`–`BOT_TOKEN_4`, `MONGO_URI`, virgülle ayrılmış `OWNER_IDS` ve isteğe bağlı `PREFIX` tanımlayın. Varsayılan prefix `.` olur. MongoDB için yerel kurulum önerilir: `MONGO_URI=mongodb://127.0.0.1:27017/guardbot` (kimlik doğrulama varsa `authSource` ekleyin). Developer Portal'da Server Members, Message Content ve mevcut yapı için Presence intentlerini açın.

`bun run start:1`, `start:2`, `start:3`, `start:4` ayrı süreçleri başlatır. Tek bot için `bun run start:all` kullanın. Node ile doğrudan `node src/Base/app.js all` çalıştırılabilir. Veritabanı bağlantısı kurulmadan Discord'a giriş yapılmaz.

Her botun rolünü müdahale edeceği yetki rollerinin üstüne taşıyın. Tüm botları başlattıktan sonra `.setup kur`, ardından `.kontrol` kullanın. `.setup onar` korumaların durumunu değiştirmeden log kanallarını onarır. Onarma özel log kategorisi/kanallarının izinlerini yalnız @everyone engeli ve aktif guard botlarının erişimi olacak şekilde yeniden kurar; özel ek izinler sıfırlanır. Sunucu sahibi ve Administrator yetkililer Discord kuralları gereği erişebilir. Herkese açık log kanalına hassas kayıt gönderilmez. Kanal gizliliği veya bot erişimi ayarlanamazsa kurulum hata verir; oluşturulan kanal ID'leri adım adım saklanır.

## Komutlar

Aşağıdaki örneklerde prefix varsayılan olarak `.` kullanılmıştır; `.env` içindeki `PREFIX` değerini değiştirirseniz kendi prefix'inizi kullanın.

- **Prefix:** `.komut ...` veya takma adları (`.ayarlar`, `.koruma`, `.safelist` vb.)
- **Slash:** `/komut ...` — Discord slash komutları global olarak kaydedilir; görünmesi biraz sürebilir.
- **Yardım:** `.yardım`, `.yardım <komut>`, `.yardım guard` veya `<komut> --help`
- **Lokalizasyon:** Slash komut/alt komut/seçenek/choice adları ve açıklamaları desteklenen tüm Discord locale’lerinde lokalize edilir (`tr` tam, diğerleri EN fallback).

### Moderasyon

| Komut | Kullanım | Açıklama |
| --- | --- | --- |
| `ban` / `yasakla` | `.ban @üye\|ID [sebep] [--sil=0..7]` | Üyeyi veya sunucuda olmayan ID’yi yasaklar. `--sil` son 0–7 gün mesajını siler. |
| `kick` / `at` | `.kick @üye\|ID [sebep]` | Üyeyi sunucudan atar. Rol sırası ve bot yetkisi kontrol edilir. |
| `timeout` / `sustur` | `.timeout @üye\|ID <1h30m\|dakika\|kaldır\|durum> [sebep]` | Susturur, kaldırır veya durumu gösterir. Sadece sayı verilirse dakika kabul edilir. |
| `unban` / `yasak-kaldir` | `.unban <ID> [sebep]` | Yasaklı kullanıcının banını kaldırır. |
| `uyar` / `warn` | `.uyar @üye\|ID [sebep]` | Uyarı ekler. Eşik dolduğunda ayarlı timeout uygulanır. |
| `uyar liste` | `.uyar liste [@üye\|ID] [sayfa]` | Aktif uyarıları listeler. |
| `uyar sil` | `.uyar sil <kayıt-id>` | Tek aktif uyarıyı siler. |
| `uyar temizle` | `.uyar temizle <@üye\|ID>` | Üyenin aktif uyarılarını temizler; sicil geçmişi korunur. |
| `sicil` | `.sicil <ID> [sayfa]` | Kalıcı moderasyon sicilini gösterir. |
| `lock` / `kilit` | `.lock kapat\|aç\|durum [#kanal] [sebep]` | Kanalı kilitler/açar. Kilit öncesi `@everyone` iznini geri yükler. |
| `kurtar` / `recovery` | `.kurtar liste [sayfa]` | Ban listesini önizler. |
| `kurtar uygula` | `.kurtar uygula ONAY [1..100]` | Onayla en fazla 100 banı kaldırır. |

### Guard / Koruma

| Komut | Kullanım | Açıklama |
| --- | --- | --- |
| `guard durum` | `.guard durum` / `.guard liste` | Tüm guard sistemlerinin durumunu gösterir. |
| `guard bilgi` | `.guard bilgi <sistem>` | Seçili sistemin durum, ceza, eşik ve log bilgisini gösterir. |
| `guard aç/kapat` | `.guard aç <sistem\|tümü>` / `.guard kapat <sistem\|tümü>` | Sistemi veya tüm güvenlik korumalarını açar/kapatır. `tag` ayrı yönetilir. |
| `guard ceza` | `.guard ceza <sistem> <karantina\|kick\|ban>` | Sistem ihlalinde uygulanacak cezayı ayarlar. |
| `guard limit` | `.guard limit <ban\|kick\|katılım\|susturma> <1..100>` | Limit/eşik değerini ayarlar. |
| `guard profil` | `.guard profil <dengeli\|sıkı>` | Hazır limit/mesaj profili uygular; korumaların açık/kapalı durumu korunur. |

**Guard sistemleri:** `ban`, `kick`, `bot`, `raid`, `channel`, `role`, `emoji`, `sticker`, `webhook`, `server`, `message`, `tag`, `timeout`  
Türkçe alias örnekleri: `rol`, `kanal`, `mesaj`, `sunucu`, `yasak`, `atma`, `baskin`, `etiket`, `susturma`.

**Slash örnekleri:**

```text
/guard liste
/guard ac sistem:role
/guard ceza sistem:role mod:quarantine
/guard limit tur:ban sayi:3
/guard profil ad:sıkı
```

### Ayarlar / Setup

| Komut | Kullanım | Açıklama |
| --- | --- | --- |
| `settings` / `ayarlar` | `.ayarlar` | Genel ayar özetini gösterir. |
| `settings log` | `.ayarlar log <sistem> <#kanal>` | İlgili sistemin log kanalını ayarlar. |
| `settings mesaj` | `.ayarlar mesaj <ayar> <değer>` | Mesaj politikasını değiştirir. |
| `settings raid` | `.ayarlar raid <ayar> <değer>` | Raid politikasını değiştirir. |
| `settings uyarı` | `.ayarlar uyarı <1..20> <süre>` | Uyarı eşiği ve timeout süresini ayarlar. |
| `settings politikalar` | `.ayarlar politikalar` | Mesaj, raid ve uyarı politikalarını okunabilir biçimde gösterir. |
| `setup` / `kurulum` | `.setup kur\|onar\|kontrol` | Log kanallarını kurar, onarır veya kontrol eder. |
| `snapshot` / `yedek` | `.snapshot al\|liste\|incele <sıra>\|yükle <sıra> ONAY` | Sunucu yedeği alır, inceler veya onayla geri yükler. |
| `komut-kanal` | `.komut-kanal liste\|sadece\|çıkar\|aç\|kapat\|her-yer [#kanal]` | Komutların kullanılabileceği kanalları kısıtlar/açar. |
| `güvenli-liste` / `safelist` | `.safelist` veya `.safelist ekle\|kaldır\|liste\|kontrol <@üye\|ID>` | Güvenli liste panelini veya liste işlemlerini yönetir. |
| `karantina` / `quarantine` | `.karantina @rol\|durum\|kapat\|listele [sayfa]\|bırak @üye\|ID` | Karantina rolünü ve karantinadaki üyeleri yönetir. |
| `tag-rol` | `.tag-rol aç @rol\|kapat\|durum\|eşitle` | Tag rolü otomasyonunu yönetir. |
| `panik` / `panic` | `.panik aç [1m..1h]\|kapat\|durum` | Panik modunu açar/kapatır; süre 1 dakika–1 saat. |

### Bilgi / Owner

| Komut | Kullanım | Açıklama |
| --- | --- | --- |
| `say` / `count` | `.say [detay]` | Sunucu üye/bot/çevrimiçi/ses/boost istatistiklerini gösterir. |
| `ping` | `.ping` | Gateway, mesaj ve veritabanı gecikmesini gösterir. |
| `kontrol` / `check` | `.kontrol` | Yetkiler, log erişimi, rol sırası, karantina, panik ve bot sinyallerini kontrol eder. |
| `yardım` / `help` | `.yardım [komut\|kategori]` | Komut yardımını gösterir. |
| `kapat` / `shutdown` | `.kapat [durum\|ONAY]` | Bot süreci durumunu gösterir; `ONAY` ile yalnız bu süreci kapatır. |

### Önemli Notlar

- Susturma süresi 1 saniye–28 gün olabilir; yalnız sayı girilirse dakika kabul edilir.
- Uyarı eşiğinin her katında ayarlı susturma denenir; başarısız susturma başarılı gösterilmez.
- Kanal kilidi önceki `@everyone` mesaj iznini kaydeder ve açarken geri yükler. Üye/rol bazlı özel izinler kilidi aşabilir.
- `snapshot yükle` ve `kurtar uygula` gibi işlemler onay gerektirir.
- `.ban` artık sunucuda olmayan kullanıcıları da ID ile yasaklayabilir.
- `guard` ceza modları: `karantina`, `kick`, `ban`.

## Koruma ayarları

Sistem anahtarları: `ban`, `kick`, `bot`, `raid`, `channel`, `role`, `emoji`, `sticker`, `webhook`, `server`, `message`, `tag`, `timeout`.

- `.guard ceza role karantina` / `kick` / `ban`.
- `.guard limit ban 3`; türler: `ban`, `kick`, `katılım`, `susturma`; aralık 1–100.
- `.guard profil dengeli` veya `.guard profil sıkı`: ban/kick/katılım/timeout ve bazı mesaj eşiklerini değiştirir; korumaları açıp kapatmaz.
- `.ayarlar log role #rol-logu`.
- `.ayarlar politikalar`: mevcut politikaları gösterir.
- `.ayarlar mesaj flood 5`, `.ayarlar mesaj invites kapat`.
- `.ayarlar mesaj hariç-ekle #kanal`, `.ayarlar mesaj hariç-kaldır #kanal`. Token taraması istisna kanallarında devam eder.
- `.ayarlar raid minAccountAgeHours 24`, `.ayarlar raid durationMs 300000`.
- `.ayarlar uyarı 3 30m`.

| Mesaj politikası | Varsayılan / aralık |
| --- | --- |
| `invites`, `scam` | açık; `aç` / `kapat` |
| `mentions` | 5; 1–50 kullanıcı/rol mention |
| `flood` | 5; 2–30 mesaj |
| `floodWindowMs` | 5000; 1000–60000 ms |
| `duplicates` | 3; 2–20 tekrar, 10 saniye penceresi |
| `emojis` | 10; 2–100 |
| `capsPercent` | 70; 10–100 |
| `capsMinLength` | 10; 5–100 harf |
| `timeoutMs` | 600000; 1000–2419200000 ms |

Raid politikası: `windowMs` varsayılan 10000 (1000–60000); `durationMs` varsayılan 300000 (60000–3600000); `minAccountAgeHours` varsayılan 0, kapalı (0–720). Panik modu MongoDB üzerinden paylaşılır ve süreç yeniden başladığında korunur. Katılım müdahalesi için `guard1` veya `all` çalışmalıdır.

## Erişim ve event davranışları

Moderasyon hem komut yetkisini hem de hedef üye hiyerarşisini kontrol eder. Kendinize, sunucu sahibine ve komut botuna ceza uygulanamaz. Koruma ayarlarını değiştiren `guard`, `settings`, `setup`, `panik` işlemleri ayrıca sunucu sahibi, bot sahibi veya safelist muafiyeti gerektirir; salt durum sorguları mevcut komut yetkileriyle kullanılabilir. Güvenli liste paneli bot sahibi ve sunucu yöneticisi yetkisi ister. Karantina, tag rolü, komut kanalı ve manuel yedek alma değişiklikleri de güvenilir yetkili gerektirir. Yetkili üyenin izinleri komuttan önce yeniden alınır.

Sunucu sahibi, bot sahipleri, safelist ve veritabanına kayıtlı guard botları korumalardan muaftır. Diğer botlar muaf değildir. Güvenli liste en fazla 200 kullanıcı içerir; panel ve komut aynı atomik sınırı kullanır. Guard botu muafiyeti hem kayıtlı ID hem en fazla 150 saniye önce alınmış durum sinyali gerektirir. Eski veya emekli botların kayıtları tek başına muafiyet sağlamaz.

İzinsiz bot ekleme audit üzerinden doğrulanır. Güvenilir kişinin eklediği bot kabul edilir; diğer botlar çıkarılmaya çalışılır ve ekleyen cezalandırılır. Audit kaydı bulunamazsa ekleyen cezalandırılmaz, bot çıkarma sonucu kaydedilir. Önceki bekleyen bot onay paneli yerine anında koruma uygulanır.

Audit kayıtları hedef ve zaman bakımından eşleştirilir, gecikme için sınırlı tekrar yapılır ve aynı kayıt aynı korumada tekrar sayılmaz. Bu tekrar önleme süreç belleğindedir. Kanal/rol değişiklikleri ve kanal bazlı izin ekleme/değiştirme/silme işlemleri denetlenir. Güncelleme kayıtları hedefin yanında eski/yeni değerlerle de eşleştirilir. Silinen tehlikeli roller yetkisiz oluşturulur ve üyelere otomatik dağıtılmaz; sahip incelemesi gerekir. Kanal/rol değişiklikleri geri alınır; emoji/sticker güncellemeleri silmek yerine eski ayarlara döndürülür. Webhook/entegrasyon müdahalesi doğrudan audit olayındaki hedefe uygulanır. Silinen webhook, entegrasyon, mesaj ve çıkarılan üyeler tam olarak geri getirilemez.

Ban/unban/timeout limit aşımında eşiği tetikleyen hedef işlemi geri alınmaya çalışılır; önceki hedefler topluca geri alınmaz. Kick işlemi geri alınamaz. Mesaj koruması düzenlenen mesajları, muaf olmayan botları ve webhook mesajlarını da inceler. Webhooklara üye susturması uygulanamaz; flood yapan bot için yapılandırılmış guard cezası denenir. Yasak içerik mesajları da flood sayacına dahil edilir. Tekrar hafızasında ham mesaj yerine SHA-256 özeti tutulur. Token içeriği loga yazılmaz. Silinen mention mesajı raporu, silen kişinin mesaj yazarı olduğunu varsaymaz.

Karantina Discord'un yönettiği rolleri korur. Kalan roller hâlâ tehlikeli yetki sağlıyorsa sonuç hata olarak işaretlenir. Karantina ve tag rolleri yetkisiz, yönetilen olmayan ve botun altında olmalıdır. Kanal bazlı karantina izinlerini ayrıca kısıtlayın. Karantinadan bırakma eski yetkileri otomatik geri vermez. Aktif karantina veritabanında ayrı tutulur; karantina rolü ayarlanmamış olsa bile tag otomasyonu bu üyeye rol eklemez. Sunucuya yeniden katılımda karantina tekrar denenir. Tag ve karantina aynı rol olamaz; kanal bazlı yönetim izinleri bulunan roller otomasyona atanamaz.

## Yedekler ve işletim sınırları

En fazla üç yapı yedeği saklanır. `SNAPSHOT_INTERVAL_HOURS` varsayılan 6, aralık 1–168 saattir. Rol/kanal ID'leri, temel kanal ayarları ve izinler kaydedilir. Mesaj geçmişi, threadler, bütün forum seçenekleri ve tam sunucu içeriği yedeklenmez.

Geri yükleme eksik öğeleri oluşturur; mevcut öğelerin ayarlarını zorla değiştirmez. Yeni ID eşlemeleri yedeğe kaydedilir ve tekrar yüklemede kullanılır. Eksik kategori veya izin rolü bulunan kanallar oluşturulmaz; başarısız adımlar raporlanır. Eski üye yetkileri otomatik geri verilmez. Yedek alma ve geri yükleme MongoDB üzerinde ortak işlem kilidi kullanır. Kilit yenilenir; sahiplik kaybında işlem durdurulur. Böylece farklı süreçlerin aynı anda yedek budaması veya geri yükleme yapması engellenir. Dağıtık kilidin gerçek MongoDB üzerinde yük/arıza deneyi bu çalışmada yapılmadı.

Her bot 60 saniyede durum sinyali yeniler. `.kontrol` 150 saniyeden eski sinyalleri eski olarak gösterir; bu anlık bağlantı garantisi değildir. Sayaçlar ve audit tekrar önleme bellektedir ve yeniden başlatmada sıfırlanır. Her görev için tek çalışan süreç kullanın. Loglar görev bazında döndürülür; veritabanı ve Discord hatalarının ayrıntıları kullanıcı yanıtına dökülmez.

## Testler

`node --test` veya npm varsa `npm test` kullanın. Testler Discord'a bağlanmadan süre/ID doğrulaması, rol hiyerarşisi, komut hataları, uyarı sonucu, mesaj politikası, safelist sınırı, audit tekrar önleme, event eşleştirme ve yedek tekrar yüklemeyi sınar. Canlı Discord ve gerçek MongoDB davranışı için ayrı test sunucusunda deneme gerekir.

## Büyük sunucu (100k+) ve Windows notları

- **Süreç modeli:** `guard1`, `guard2`, `guard3`, `snapshot` ayrı konsollarda/servislerde çalıştırmak önerilir (`bun run start:1` …). Tek süreçte tüm yük ve çakışma riski artar.
- **Mesaj koruması başlangıç ayarı (öneri):** `flood 4`, `floodWindowMs 5000`, `mentions 4`, `duplicates 2`, `emojis 8`, `capsPercent 75`, `capsMinLength 12`. GIF/medya ağırlıklı kanallar için `ayarlar mesaj hariç-ekle #kanal` ile istisna verin; token taraması yine çalışır. Uygulamak için örn: `.ayarlar mesaj flood 4`, `.ayarlar mesaj floodWindowMs 5000`, `.ayarlar mesaj mentions 4`, `.ayarlar mesaj duplicates 2`, `.ayarlar mesaj emojis 8`, `.ayarlar mesaj capsPercent 75`, `.ayarlar mesaj capsMinLength 12`.
- **Limit/ceza:** İlk etapta `guard profil dengeli`; yanlış pozitif azalınca gerekirse `sıkı`. `limits.ban/kick/joins/timeout` değerlerini loglara göre ayarlayın.
- **Audit güvenilirliği (bilinen trade-off):** Olay eşleştirmesi kısa bir zaman penceresi ve sınırlı yeniden denemeyle yapılır; Discord audit gecikmesinde nadiren işlem kaçabilir. Bu, yanlış cezalardan kaçınmak için güvenli tarafa çekilmiş bir davranıştır; kritik anlarda logları ve `.kontrol` çıktısını birlikte inceleyin.
- **Windows servis:** Kalıcı çalıştırma için PM2 (`pm2 start ...`) veya Windows Task Scheduler + ayrı kullanıcı; “Beklenmeyen hata” sonrası süreç kapanır, otomatik yeniden başlatma için bir süreç yöneticisi şart.
- **Yedek/snapshot:** Değişiklik öncesi `snapshot al`; MongoDB Atlas yedeği ayrıca alın. Kurtarma işlemlerinde `.kurtar` / snapshot yükleme sadece onaylı ve sınırlı kullanın. Geri yükleme eksik yapıları oluşturur, mevcut ayarları zorla değiştirmez ve üye yetkilerini otomatik geri vermez.

## Güvenlik denetimi — 16 Ekim 2026

İşlev açıklaması ve bulgular: [güvenlik raporu](docs/SECURITY_REVIEW.md). Kaynak envanteri: [security-inventory.json](docs/security-inventory.json). Rapor gerçek token veya bağlantı adresi içermez. Beklenmeyen yakalanmamış hatada süreç güvenli biçimde kapanır; otomatik yeniden başlatma için ayrıca bir süreç yöneticisi gerekir.


---

## English

Discord guard and moderation bot with role-shared responsibilities.

## Roles and Setup

| Role | Responsibility |
| --- | --- |
| `guard1` | Ban, unban, kick, timeout, bot, and raid protection |
| `guard2` | Channel, role, member-role, emoji, and sticker protection |
| `guard3` | Server, webhook, integration, message, tag, and prefix commands |
| `snapshot` | Automatic structure backups |
| `all` | All responsibilities in a single bot |

Requires Node.js 22 or 24 LTS with current security patches; existing start commands use Bun. Install dependencies with `bun install`. In `.env`, define `BOT_TOKEN_1`–`BOT_TOKEN_4`, `MONGO_URI`, comma-separated `OWNER_IDS`, and optional `PREFIX`. Default prefix is `.`. Local MongoDB is recommended: `MONGO_URI=mongodb://127.0.0.1:27017/guardbot` (add `authSource` if authentication is enabled). Enable Server Members, Message Content, and Presence intents in the Developer Portal.

`bun run start:1`, `start:2`, `start:3`, `start:4` start separate processes. For a single bot, use `bun run start:all`. You can also run directly with Node: `node src/Base/app.js all`. The bot does not log in to Discord before the database connection is established.

Move each bot's role above the roles it should moderate. After starting all bots, use `.setup kur`, then `.kontrol`. `.setup onar` repairs log channels without changing guard enabled/disabled states. Repair resets private log category/channel permissions to @everyone deny + active guard bot access; custom extra permissions are cleared. Server owner and Administrators can access by Discord rules. Sensitive logs are never sent to public log channels. If channel privacy or bot access cannot be configured, setup fails; created channel IDs are stored step by step.

## Commands

Examples below use the default `.` prefix; if you changed `PREFIX` in `.env`, use your own prefix.

- **Prefix:** `.command ...` or aliases (`.ayarlar`, `.koruma`, `.safelist`, etc.)
- **Slash:** `/command ...` — Discord slash commands are registered globally; propagation may take a while.
- **Help:** `.help`, `.help <command>`, `.help guard`, or `<command> --help`
- **Localization:** Slash command/subcommand/option/choice names and descriptions are localized for all supported Discord locales (`tr` full, others EN fallback).

### Moderation

| Command | Usage | Description |
| --- | --- | --- |
| `ban` / `yasakla` | `.ban @user\|ID [reason] [--sil=0..7]` | Bans a member or an ID not in the server. `--sil` deletes last 0–7 days of messages. |
| `kick` / `at` | `.kick @user\|ID [reason]` | Kicks a member. Checks role hierarchy and bot permissions. |
| `timeout` / `sustur` | `.timeout @user\|ID <1h30m\|minutes\|remove\|status> [reason]` | Applies/removes timeout or shows status. Plain number is treated as minutes. |
| `unban` / `yasak-kaldir` | `.unban <ID> [reason]` | Removes a ban. |
| `warn` / `uyar` | `.warn @user\|ID [reason]` | Adds a warning. Configured timeout is attempted at threshold multiples. |
| `warn list` | `.warn list [@user\|ID] [page]` | Lists active warnings. |
| `warn delete` | `.warn delete <record-id>` | Deletes one active warning. |
| `warn clear` | `.warn clear <@user\|ID>` | Clears active warnings; moderation history is kept. |
| `sicil` / `record` | `.sicil <ID> [page]` | Shows permanent moderation record. |
| `lock` / `kilit` | `.lock close\|open\|status [#channel] [reason]` | Locks/unlocks a channel. Restores previous `@everyone` send permission on unlock. |
| `recovery` / `kurtar` | `.recovery list [page]` | Previews ban list. |
| `recovery apply` | `.recovery apply CONFIRM [1..100]` | Removes up to 100 bans after explicit confirmation. |

### Guard / Protection

| Command | Usage | Description |
| --- | --- | --- |
| `guard status` | `.guard status` / `.guard list` | Shows all guard system statuses. |
| `guard info` | `.guard info <system>` | Shows status, punishment, limit, and log channel for a system. |
| `guard on/off` | `.guard on <system\|all>` / `.guard off <system\|all>` | Enables/disables a system or all security guards. `tag` is managed separately. |
| `guard punish` | `.guard punish <system> <quarantine\|kick\|ban>` | Sets punishment for a system violation. |
| `guard limit` | `.guard limit <ban\|kick\|joins\|timeout> <1..100>` | Sets limit/threshold. |
| `guard profile` | `.guard profile <balanced\|strict>` | Applies preset limits/message thresholds; does not toggle guards on/off. |

**Guard systems:** `ban`, `kick`, `bot`, `raid`, `channel`, `role`, `emoji`, `sticker`, `webhook`, `server`, `message`, `tag`, `timeout`  
Turkish aliases are also accepted, e.g. `rol`, `kanal`, `mesaj`, `sunucu`.

**Slash examples:**

```text
/guard list
/guard ac sistem:role
/guard ceza sistem:role mod:quarantine
/guard limit tur:ban sayi:3
/guard profil ad:sıkı
```

### Settings / Setup

| Command | Usage | Description |
| --- | --- | --- |
| `settings` / `ayarlar` | `.settings` | Shows settings summary. |
| `settings log` | `.settings log <system> <#channel>` | Sets log channel for a system. |
| `settings message` | `.settings message <setting> <value>` | Updates message policy. |
| `settings raid` | `.settings raid <setting> <value>` | Updates raid policy. |
| `settings warning` | `.settings warning <1..20> <duration>` | Sets warning threshold and timeout duration. |
| `settings policies` | `.settings policies` | Shows message, raid, and warning policies in readable form. |
| `setup` / `kurulum` | `.setup install\|repair\|check` | Installs, repairs, or checks log channel setup. |
| `snapshot` / `yedek` | `.snapshot take\|list\|inspect <index>\|load <index> CONFIRM` | Takes, inspects, or restores server snapshots with confirmation. |
| `command-channel` / `komut-kanal` | `.command-channel list\|only\|remove\|open\|close\|everywhere [#channel]` | Restricts/allows command channels. |
| `safelist` / `güvenli-liste` | `.safelist` or `.safelist add\|remove\|list\|check <@user\|ID>` | Manages safelist panel or list operations. |
| `quarantine` / `karantina` | `.quarantine @role\|status\|close\|list [page]\|release @user\|ID` | Manages quarantine role and quarantined members. |
| `tag-role` / `tag-rol` | `.tag-role on @role\|off\|status\|sync` | Manages tag role automation. |
| `panic` / `panik` | `.panic on [1m..1h]\|off\|status` | Enables/disables panic mode; duration 1 minute–1 hour. |

### Info / Owner

| Command | Usage | Description |
| --- | --- | --- |
| `say` / `count` | `.say [detail]` | Shows server member/bot/online/voice/boost stats. |
| `ping` | `.ping` | Shows gateway, message, and database latency. |
| `check` / `kontrol` | `.check` | Checks permissions, log access, role hierarchy, quarantine, panic, and bot signals. |
| `help` / `yardım` | `.help [command\|category]` | Shows command help. |
| `shutdown` / `kapat` | `.shutdown [status\|CONFIRM]` | Shows process status; `CONFIRM` shuts down only this process. |

### Important Notes

- Timeout duration can be 1 second–28 days; plain numbers are treated as minutes.
- Warning timeout is attempted at each threshold multiple; failed timeout is not reported as success.
- Channel lock saves previous `@everyone` send permission and restores it on unlock. Member/role-specific overwrites can bypass lock.
- `snapshot load` and `recovery apply` require explicit confirmation.
- `.ban` can ban IDs not currently in the server.
- Guard punishment modes: `quarantine`, `kick`, `ban`.

## Protection Settings

System keys: `ban`, `kick`, `bot`, `raid`, `channel`, `role`, `emoji`, `sticker`, `webhook`, `server`, `message`, `tag`, `timeout`.

- `.guard punish role quarantine` / `kick` / `ban`.
- `.guard limit ban 3`; types: `ban`, `kick`, `joins`, `timeout`; range 1–100.
- `.guard profile balanced` or `.guard profile strict`: changes limits and some message thresholds; does not toggle guards on/off.
- `.settings log role #role-log`.
- `.settings policies`: shows current policies.
- `.settings message flood 5`, `.settings message invites off`.
- `.settings message exclude-add #channel`, `.settings message exclude-remove #channel`. Token scanning continues in excluded channels.
- `.settings raid minAccountAgeHours 24`, `.settings raid durationMs 300000`.
- `.settings warning 3 30m`.

| Message policy | Default / range |
| --- | --- |
| `invites`, `scam` | on; `on` / `off` |
| `mentions` | 5; 1–50 user/role mentions |
| `flood` | 5; 2–30 messages |
| `floodWindowMs` | 5000; 1000–60000 ms |
| `duplicates` | 3; 2–20 repeats, 10s window |
| `emojis` | 10; 2–100 |
| `capsPercent` | 70; 10–100 |
| `capsMinLength` | 10; 5–100 letters |
| `timeoutMs` | 600000; 1000–2419200000 ms |

Raid policy: `windowMs` default 10000 (1000–60000); `durationMs` default 300000 (60000–3600000); `minAccountAgeHours` default 0, disabled (0–720). Panic mode is shared through MongoDB and survives process restarts. Join intervention requires `guard1` or `all` running.

## Access and Event Behavior

Moderation checks both command permission and target member hierarchy. You cannot punish yourself, the server owner, or the command bot. Guard-setting changes (`guard`, `settings`, `setup`, `panic`) also require server owner, bot owner, or safelist exemption; read-only status queries can be used with normal command permissions. Safelist panel requires bot owner and server Administrator permission. Quarantine, tag role, command channel, and manual snapshot changes also require trusted authority. Authorized member permissions are re-fetched before command execution.

Server owner, bot owners, safelist, and database-registered guard bots are exempt from guards. Other bots are not exempt. Safelist contains at most 200 users; panel and command use the same atomic limit. Guard bot exemption requires both registered ID and a status signal received within the last 150 seconds. Old/retired bot records alone do not grant exemption.

Unauthorized bot additions are verified through audit logs. Bots added by trusted users are accepted; others are attempted to be removed and the adder is punished. If audit entry is not found, adder is not punished and bot removal result is logged. Instant protection is applied instead of a pending bot approval panel.

Audit entries are matched by target and time, limited retries are used for delay, and the same entry is not counted twice in the same guard. This dedupe is in-process memory. Channel/role changes and channel overwrite add/update/delete are audited. Update entries are matched by old/new values as well as target. Deleted dangerous roles are not recreated with dangerous permissions and not auto-distributed to members; owner review is required. Channel/role changes are reverted; emoji/sticker updates are restored to old settings instead of deleting. Webhook/integration intervention is applied to the direct audit target. Deleted webhooks, integrations, messages, and removed members cannot be fully restored.

On ban/unban/timeout limit exceed, the target action that triggered the threshold is attempted to be reverted; previous targets are not bulk reverted. Kick cannot be reverted. Message guard inspects edited messages, non-exempt bots, and webhook messages. Member timeout cannot be applied to webhooks; configured guard punishment is attempted for flooding bots. Forbidden-content messages also count toward flood. Duplicate memory stores SHA-256 digest instead of raw message. Token content is never written to logs. Deleted mention message report does not assume the deleter is the message author.

Quarantine preserves Discord-managed roles. If remaining roles still grant dangerous permissions, result is marked as error. Quarantine and tag roles must be unmanaged, non-dangerous, and below the bot. Restrict channel-level quarantine permissions separately. Releasing from quarantine does not restore old roles automatically. Active quarantine is stored separately in DB; tag automation does not add tag role to quarantined members even if quarantine role is unset. Quarantine is re-attempted on rejoin. Tag and quarantine cannot be the same role; roles with channel-level management permissions cannot be assigned to automation.

## Backups and Operational Limits

At most three structure backups are kept. `SNAPSHOT_INTERVAL_HOURS` default is 6, range 1–168. Role/channel IDs, basic channel settings, and permissions are saved. Message history, threads, all forum options, and full server content are not backed up.

Restore creates missing items; it does not force-change settings of existing items. New ID mappings are saved to the backup and reused on subsequent restores. Channels with missing category or permission roles are not created; failed steps are reported. Old member permissions are not restored automatically. Backup and restore use a shared MongoDB operation lease. Lease is renewed; operation stops on ownership loss. This prevents concurrent backup pruning/restore across processes. Distributed lease load/failure testing on real MongoDB was not performed in this work.

Each bot renews status signal every 60 seconds. `.kontrol` shows signals older than 150 seconds as stale; this is not an instant connection guarantee. Counters and audit dedupe are in memory and reset on restart. Use one running process per role. Logs are rotated by role; database and Discord error details are not leaked to user responses.

## Tests

Use `node --test` or `npm test` if npm is available. Tests cover duration/ID validation, role hierarchy, command errors, warning outcomes, message policy, safelist limit, audit dedupe, event matching, and snapshot reapply without connecting to Discord. Live Discord and real MongoDB behavior require a separate test server.

## Large Server (100k+) and Windows Notes

- **Process model:** Running `guard1`, `guard2`, `guard3`, `snapshot` in separate consoles/services is recommended (`bun run start:1` …). Single-process all-role mode increases load and collision risk.
- **Message protection starter settings:** `flood 4`, `floodWindowMs 5000`, `mentions 4`, `duplicates 2`, `emojis 8`, `capsPercent 75`, `capsMinLength 12`. For GIF/media-heavy channels, use `settings message exclude-add #channel`; token scanning still runs. Example: `.settings message flood 4`, `.settings message floodWindowMs 5000`, etc.
- **Limits/punishment:** Start with `guard profile balanced`; move to `strict` if false positives decrease. Tune `limits.ban/kick/joins/timeout` based on logs.
- **Audit reliability (known trade-off):** Event matching uses a short time window and limited retries; rare actions may be missed during Discord audit delay. This is biased toward safety to avoid false punishments; inspect logs and `.kontrol` together during critical incidents.
- **Windows service:** For persistence use PM2 (`pm2 start ...`) or Windows Task Scheduler + separate user; process exits on unexpected fatal error, so a process manager is required for auto-restart.
- **Backup/snapshot:** Take `snapshot al` before changes; keep separate MongoDB Atlas backups. Use `.recovery` / snapshot restore only with confirmation and limited scope. Restore creates missing structures, does not force-change existing settings, and does not auto-restore member permissions.

## Security Review — 16 Oct 2026

Feature description and findings: [security report](docs/SECURITY_REVIEW.md). Source inventory: [security-inventory.json](docs/security-inventory.json). The report contains no real tokens or connection strings. On unexpected uncaught errors the process exits safely; an external process manager is required for auto-restart.
