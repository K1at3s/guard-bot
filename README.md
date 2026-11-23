# Guard Bot

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

Aşağıdaki örneklerdeki prefix varsayılandır; değiştirdiyseniz kendi prefix'inizi kullanın. `.yardım <komut>` ve `<komut> --help` kullanım ayrıntısını gösterir. `.yardım mod`, `.yardım guard`, `.yardım setup`, `.yardım info`, `.yardım owner` kategorileri filtreler.

| Komut | Gelişmiş kullanım |
| --- | --- |
| `ban` | `.ban @üye sebep --sil=1` — 0–7 günlük mesaj silme seçeneği |
| `kick` | `.kick @üye sebep` — yetkilinin ve botun rol sırası doğrulanır |
| `timeout` | `.timeout @üye 1h30m sebep`, `.timeout @üye kaldır`, `.timeout @üye durum` |
| `unban` | `.unban ID sebep` — mevcut ban doğrulanır |
| `uyar` | `.uyar @üye sebep`, `.uyar liste ID 2`, `.uyar sil KAYIT_ID`, `.uyar temizle ID` |
| `sicil` | `.sicil ID 2` — kalıcı moderasyon geçmişi |
| `lock` | `.lock kapat #kanal sebep`, `.lock aç #kanal`, `.lock durum` |
| `panik` | `.panik aç 15m`, `.panik kapat`, `.panik durum`; süre 1 dakika–1 saat |
| `kurtar` | `.kurtar liste 2`, `.kurtar uygula ONAY 25`; tek çalışmada en fazla 100 ban |
| `snapshot` | `.snapshot al`, `.snapshot liste`, `.snapshot incele 1`, `.snapshot yükle 1 ONAY` |
| `guard` | `.guard bilgi role`, `.guard aç tümü`, `.guard kapat channel`, `.guard profil sıkı` |
| `settings` / `ayarlar` | Durum, log kanalı ve mesaj/raid/uyarı politikalarını yönetir |
| `setup` | `.setup kontrol`, `.setup onar`, `.setup kur` |
| `komut-kanal` | `.komut-kanal liste 1`, `sadece #kanal`, `çıkar #kanal`, `aç #kanal`, `kapat #kanal`, `her-yer` |
| `güvenli-liste` / `safelist` | Panel; `ekle ID`, `kaldır ID`, `kontrol ID`, `liste 2`. Panel çoklu seçim destekler |
| `karantina` | `.karantina @rol`, `durum`, `listele 2`, `bırak @üye`, `kapat` |
| `tag-rol` | `.tag-rol aç @rol`, `durum`, `eşitle`, `kapat` |
| `say` | `.say detay` — üyeler, botlar, çevrimiçi, ses, tag, boost ve sunucu ayrıntıları |
| `ping` | Gateway, mesaj ve veritabanı gecikmesi; çalışma süresi ve bellek |
| `kontrol` | Yetkiler, log erişimi, rol sırası, karantina, panik ve bot durum sinyalleri |
| `kapat` | Sistem durumu; `.kapat ONAY` yalnız bu bot sürecini kapatır |

Susturma süresi 1 saniye–28 gün olabilir; yalnız sayı girilirse dakika kabul edilir. Uyarı eşiğinin her katında yapılandırılmış susturma denenir. Başarısız susturma başarılı gösterilmez. Uyarı silme/temizleme aktif listeyi değiştirir; sicil geçmişi korunur. En fazla 2000 aktif uyarı tutulur; sınıra gelince kayıtlar sessizce silinmez, yeni uyarı reddedilir.

Kanal kilidi önceki `@everyone` mesaj iznini kaydeder ve açarken geri yükler. Üye veya rol bazlı özel izinler kilidi aşabilir. Thread kilidi desteklenmez. Kayıtlı kilit bulunmadığında mevcut izin otomatik değiştirilmez.

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
