# Guard Bot — işlevler ve güvenlik denetimi

Tarih: 16 Ekim 2026. Bu rapor kaynak kod incelemesini, yapılan düzeltmeleri ve doğrulama sınırlarını anlatır. Güvenlik sertifikası veya bütün açıklardan arınmışlık garantisi değildir.

## Bot nasıl çalışır?

Bot Discord olaylarını alır, MongoDB'deki sunucu ayarını okur, ilgili koruma açıksa işlemi audit kaydıyla eşleştirir. Fail muaf değilse yapılandırılmış ceza ve uygun geri alma işlemi denenir. Ceza ve geri alma sonuçları ayrı raporlanır. Audit kaydı güvenilir biçimde eşleştirilemiyorsa o olay üzerinden fail cezalandırılmaz. Bot ekleme koruması, fail bulunmasa bile izinsiz botu çıkarmayı deneyebilir.

### Görev dağılımı

| Süreç | İşlev |
| --- | --- |
| guard1 | Ban, ban kaldırma, kick, timeout, bot ekleme, raid ve aktif karantinanın yeniden katılımda uygulanması |
| guard2 | Kanal, kanal izinleri, rol, tehlikeli üye rolü, emoji ve sticker |
| guard3 | Sunucu, davet, prune, webhook/entegrasyon, mesaj, tag, komutlar ve panel |
| snapshot | Otomatik yapı yedekleri |
| all | Tek botta bütün görevler |

Her görevi yalnız bir kez çalıştırın. `all` ile ayrı görevleri aynı anda çalıştırmak çakışan müdahalelere yol açabilir. Komutlar yalnız `guard3` veya `all` üzerinde yüklenir.

### Korumaların tamamı

| Sistem | Tetik ve müdahale |
| --- | --- |
| ban | Bir yetkilinin dakika içindeki ban sayısını izler. Varsayılan üçüncü işlemde ceza dener; eşiği tetikleyen hedefin banını kaldırmayı dener. |
| unban | Ban kaldırma sayısını ayrı sayaçla izler; ban sistemi eşiğini kullanır. Eşikte yetkili cezalandırılır, son hedef yeniden banlanmaya çalışılır. |
| kick | Gerçek kick audit kaydını doğrular; varsayılan üçüncü kick'te yetkiliye müdahale eder. Atılan üyeyi sunucuya geri sokamaz. |
| timeout | Yeni susturmayı ve audit'teki zaman değerini eşleştirir. Varsayılan dördüncü işlemde fail cezalandırılır, son hedefin susturması kaldırılmaya çalışılır. |
| bot | Ekleyeni audit'ten bulur. Muaf kişinin eklediği bot kabul edilir; diğer botlar çıkarılmaya, ekleyen cezalandırılmaya çalışılır. |
| raid | Varsayılan 10 saniyede 5 katılımda 5 dakikalık katılım engeli açar. Panik sırasında muaf olmayan insanlar atılmaya çalışılır. İsteğe bağlı hesap yaşı eşiği vardır. Bot katılımı ayrı bot korumasındadır. |
| channel | İzinsiz oluşturmayı silmeye, silinen normal kanalı ayarlarıyla kopyalamaya, güncellemeyi geri almaya çalışır. Silinen thread otomatik yeniden oluşturulmaz. |
| channel permissions | Kanal bazlı izin ekleme/değiştirme/silme audit olaylarını ayrıca izler. İlgili rol/üye izin kaydı geri alınır; daha sonra değişmiş durumun üzerine eski izin yazılmaz. |
| role | İzinsiz rol oluşturma/silme/güncellemeyi izler. Silinen tehlikeli rol yetkisiz oluşturulur ve üyelere otomatik dağıtılmaz. Standart roller için önbellek veya yedekteki üyeler kullanılabilir. |
| member role | Üyeye verilen yeni rolün yönetim, moderasyon veya benzeri tehlikeli yetkisi varsa geri almaya ve ekleyeni cezalandırmaya çalışır. |
| emoji / sticker | Oluşturmayı kaldırır, güncellemeyi eski özelliklerine döndürür, silineni uygun formatta yeniden oluşturmayı dener. Lottie sticker geri yüklenmez. |
| webhook / integration | Audit olayının tam hedefi üzerinde müdahale eder. İzinsiz oluşturulmuş/değiştirilmiş hedef silinmeye çalışılır. Silinen hedefin tokenı ve eski tam durumu geri getirilemez. |
| server | İsim, ikon, banner, doğrulama, içerik filtresi, bildirim, AFK ve ilgili sistem kanalları gibi ayarları izler. Desteklenen ayarlar geri alınır. Özel davet adresi otomatik geri alınmaz. |
| invite / prune | Dakikada 5 davet işlemi eşiği vardır. Prune doğrudan audit'ten işlenir; çıkarılan üyeler geri getirilemez. |
| message | Token örüntüsü, mention, davet/şüpheli bağlantı örüntüleri, flood, tekrar, büyük harf ve emoji yoğunluğunu denetler. Düzenlenen, webhook ve muaf olmayan bot mesajları da incelenir. Zararlı mesaj silme, insanlara susturma, bot flood'unda yapılandırılmış ceza denenir. |
| bulk delete / ghost mention | İzinsiz toplu silmede fail cezalandırılır. Mention içeren silinen mesaj kaydedilir; mesajı silenin yazarı olduğu varsayılmaz. |
| tag | Sunucu tag'ine göre yetkisiz otomasyon rolü ekler/kaldırır. Aktif karantinadaki üyeyi atlar. |

Üç ceza modu vardır: `quarantine` yönetilen olmayan rolleri kaldırır ve ayarlıysa karantina rolü verir; `kick` sunucudan atar; `ban` yasaklar. Discord'un yönettiği rol veya başka bir nedenle tehlikeli yetki kalırsa karantina başarılı gösterilmez. Karantina aktifliği ayrı veritabanı kaydında tutulur.

### 22 komut

| Komut | İşlev |
| --- | --- |
| ban | Gerekçeli yasaklama, isteğe bağlı 0–7 günlük mesaj silme |
| kick | Üye atma |
| timeout | 1 saniye–28 gün susturma, kaldırma, durum; `1h30m` desteklenir |
| unban | Mevcut banı gerekçeli kaldırma |
| uyar | Uyarı verme, sayfalı liste, kayıt silme, kullanıcı uyarılarını temizleme; eşikte susturma |
| sicil | Kalıcı moderasyon geçmişini sayfalı görüntüleme |
| lock | Kanal kilitleme, kayıtlı önceki `@everyone` mesaj iznini geri getirme, durum |
| panik | 1 dakika–1 saat süreyle katılım engeli açma/kapatma/durum |
| kurtar | Ban listesi önizlemesi; `ONAY` ile en fazla 100 banı kaldırma |
| snapshot | Yedek alma, listeleme, inceleme; bot sahibinin `ONAY`ı ile eksik yapıları geri oluşturma |
| guard | Koruma açma/kapatma, ceza ve eşik, dengeli/sıkı profil |
| settings / ayarlar | Durum, log kanalı, mesaj, raid ve uyarı politikaları |
| setup | Kurulum kontrolü, özel log kanalı onarma, korumaları kurma/açma |
| komut-kanal | Komutların çalışacağı veya engelleneceği kanalları yönetme |
| güvenli-liste / safelist | Metin komutu veya çoklu seçimli panel ile güvenilir kullanıcı yönetimi |
| karantina | Rol ayarı, aktif liste, kontrollü bırakma |
| tag-rol | Rol ayarı, kapatma, mevcut üyeleri eşitleme |
| say | Sunucu, üye, bot, ses, çevrimiçi, boost ve ayrıntılı istatistikler |
| ping | Gateway, mesaj ve veritabanı gecikmesi; çalışma süresi/bellek |
| kontrol | Bot yetkileri, rol sırası, log erişimi, panik, karantina, durum sinyalleri |
| yardım | Kategori/komut bazlı kullanım, bekleme ve bot yetkileri |
| kapat | Süreç durumu; `ONAY` ile bu bot sürecini kapatma |

Komut örnekleri ve politika aralıkları [README](../README.md) içindedir. Varsayılan prefix `.` olur. Her komut kendi yetkisini ve gerekiyorsa botun yetkisini denetler. Hedefli moderasyonda kendine/sahibe/bota işlem engeli ve rol sırası kontrolü vardır.

## Denetimde düzeltilenler

| Risk | Önceki durum | Düzeltme ve kanıt |
| --- | --- | --- |
| Yüksek: hassas ayarlara erişim | Bazı rol/kanal/yedek işlemleri yalnız ManageGuild/Administrator kontrolüne dayanıyordu. | Komut bazlı salt okuma listesi ve güvenilir yetkili şartı eklendi. Yetkili üyelik bilgisi yeniden alınır. Yetki atlatma testleri mevcut. |
| Yüksek: kanal izinleri | Kanal izin overwrite işlemleri normal kanal güncellemesiyle tam örtüşmüyordu. | Ayrı audit dinleyicisi; hedef izin kaydına müdahale; güncel durum eşleşmiyorsa geri alma yapılmaz. |
| Yüksek: tehlikeli rolün geri dağıtımı | Silinen rolün tehlikeli izinleri ve eski üye listesi otomatik geri verilebiliyordu. | Yönetim/moderasyon izinleri kaldırılarak oluşturulur; üye dağıtımı sahip incelemesine bırakılır. |
| Yüksek: otomasyonla yetki kazanma | Sıfır global izinli bir rolün kanal bazlı yönetim yetkileri gözden kaçabiliyordu. | Kanal izinleri de kontrol edilir. Tag/karantina aynı rol olamaz; kalıcı karantina tag otomasyonunda ve yeniden katılımda korunur. |
| Orta: eski guard muafiyeti | Kayıtlı bot ID'si kalıcı muafiyet veriyordu. | Kayıtlı ID ile birlikte 150 saniyeden yeni durum sinyali gerekir. Bilinmeyen kullanıcı ID'si muaf sayılmaz. |
| Orta: yanlış audit eşleşmesi | Aynı hedefin son kaydı başka bir değişikliğe ait olabiliyordu. | Güncelleme olaylarında eski/yeni değerler ve ilgili değişiklik alanları eşleştirilir. Gelecek/bozuk zamanlı doğrudan audit olayları reddedilir. |
| Orta: gizli bilgi ve kayıt bütünlüğü | Konsol maskelemesi Discord raporlarını/kalıcı gerekçeleri kapsamıyordu. | Ortak maskeleme; gerekçe ve detaylar kaydetmeden, komutlar kısaltmadan önce temizlenir. Dosya loglarında satır kırmaları kaçırılır. |
| Orta: log gizliliği | Önceden kalmış ek izinler log kanallarını açığa çıkarabiliyordu. | Kurulum/onarma özel izin setini yeniden kurar. Herkese açık log hedefi reddedilir; gönderim katmanı da kontrol eder. |
| Orta: kaynak tüketimi | Kapasite dolunca sayaçların tamamı siliniyor; ham tekrar mesajları saklanıyordu. | Süresi dolan kayıtlar temizlenir; dolu kapasitede yeni anahtarlar reddedilir. Sayaç boyutu sınırlı, tekrar hafızası SHA-256. Komut giriş limiti vardır; sahipler acil müdahale için bu giriş limitinden muaftır. |
| Orta: eşzamanlı yedek | Yalnız süreç içi kilit vardı; eski eşleme verisiyle tekrar oluşturma olabiliyordu. | MongoDB sahiplikli, yenilenen kilit; yedek eşlemeleri kilit alındıktan sonra yeniden okunur. Kaybolan yedek kaydında işlem durur. |
| Orta: veri büyümesi | Aktif uyarılar sınırsız büyüyor ve koruma okumalarına taşınıyordu. | 2000 aktif uyarı sınırı atomik sorguyla uygulanır. Koruma okumaları uyarı dizisini almaz. Eski uyarılar sessizce silinmez. |
| Sertleştirme | Beklenmeyen hatadan sonra süreç devam ediyordu; kurtarma durum mesajı hatasında süreç içi işaret kalabiliyordu. | Beklenmeyen yakalanmamış hatada güvenli kapanma; kurtarma işareti hata halinde bırakılır. |
| Bağımlılık/runtime tabanı | Manifest eski Mongoose ve artık desteklenmeyen Node sürümlerine izin veriyordu. | Mongoose alt sınırı 8.24.5, Node alt sınırı 22 yapıldı; kilit dosyası eşleşmesi doğrulandı. Kurulu sürümde tarama bilinen açık bildirmedi. |

Üreticinin [Mongoose güvenlik bildirimi](https://github.com/Automattic/mongoose/security/advisories/GHSA-664h-wqgq-64gw), eski sürümlerde güncelleme yolu üzerinden prototype pollution bildirir. Burada kurulu 8.24.5 sürümünün bu bildirime göre etkilenmiş olduğu söylenmiyor; manifestin daha eski sürümlere izin vermesi daraltıldı. Node 18/20 için destek durumuna [Node.js EOL sayfasından](https://nodejs.org/en/about/eol) bakıldı.

## Doğrulama kanıtları

- `node --test`: 62 test, 62 başarılı, 0 başarısız. [Ham çıktı](test-results.tap).
- Bütün `src/` ve `test/` JavaScript dosyaları `node --check` ile kontrol edildi.
- `bun audit --json`: başarılı npm güvenlik sorgusu, boş bulgu nesnesi `{}`. [Kayıt](dependency-audit.json).
- `bun install --frozen-lockfile --lockfile-only --ignore-scripts`: manifest/kilit dosyası uyumu başarılı; kurulum scriptleri çalıştırılmadı.
- Kaynak taramasında sabit Discord token örüntüsü bulunmadı. Bu yalnız kullanılan örüntüye dayalı kontroldür; bütün gizli bilgi türlerini yakalama iddiası yoktur.
- 4 farklı tokenın, biçimce geçerli 1 sahip kaydının ve MongoDB ayarının bulunduğu değerleri göstermeden kontrol edildi. URI'de açıkça güvensiz TLS seçenekleri saptanmadı; bu sonuç bağlantının şifreli veya dış erişime kapalı olduğunu kanıtlamaz.
- Dosya listesi, SHA-256 değerleri ve bağımlılık sürümleri [envanterde](security-inventory.json). `.env` değerleri envantere alınmadı.

## Kalan güven sınırları

1. Canlı Discord test sunucusunda bot rol sırası, kanal izinleri, intentler, audit gecikmesi ve gerçek müdahale başarısı denenmedi. Gerçek MongoDB'de bağlantı, sorgu planı, dağıtık kilidin arıza/yük davranışı ve veri göçü denenmedi; bu alanlardaki testler taklit bağımlılıklar kullanır.
2. Sunucu sahibi, bot sahipleri ve güvenli listedeki kullanıcılar bilinçli olarak yüksek güven taşır. Bunların veya bot tokenının ele geçirilmesini uygulama kodu tek başına engelleyemez. Discord Administrator yetkisi kanal gizliliğini aşar.
3. Botun üstündeki rollere ve Discord'un izin vermediği işlemlere müdahale edilemez. Audit kaydı bulunmaması veya eşleşmemesi halinde otomatik fail cezası uygulanmaz. Bu güvenli karar bazı saldırılarda müdahalenin kaçmasına da yol açabilir.
4. Sayaçlar, komut beklemeleri ve audit tekrar önleme bellektedir; yeniden başlatmada sıfırlanır. Yedek işlemleri haricinde farklı süreçler için ortak olay tekilleştirmesi yoktur. Her görevi tek süreç olarak çalıştırın.
5. Yedek tam sunucu kopyası değildir: mesaj geçmişi, bütün forum/thread özellikleri ve üye yetkileri otomatik geri yüklenmez. Mevcut öğeler zorla değiştirilmez. Silinen üye, webhook, entegrasyon ve özel davet tam olarak kurtarılamaz.
6. Şüpheli bağlantı kontrolü bilinen metin örüntüleridir; antivirüs veya bütün oltalama sitelerini tanıyan bir sistem değildir. Token örüntüsü de bütün olası gizli bilgi biçimlerini tanımaz. Önceden diske/veritabanına yazılmış eski kayıtlar bu denetimde topluca taranıp temizlenmedi.
7. İşletim sistemi/hesap güvenliği, MongoDB ağ sınırları ve erişim hakları, yedeklerin harici güvenli kopyası ve gerçek tokenların geçerliliği bu kaynak kod denetiminin doğrulanmış kapsamına dahil değildir. Bot süreçleri başlatılmadı veya yeniden başlatılmadı; değişiklikler kaynak dosyalardadır.

Bu sınırlar nedeniyle sonuç “hiçbir güvenlik açığı yok” değil, “incelenen kaynak yollarındaki saptanan riskler düzeltildi ve belirtilen otomatik kontroller geçti” olarak okunmalıdır.
