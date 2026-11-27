# Changelog

## 2026-11-27

### Added
- **Slash komut desteği:** Tüm mevcut prefix komutları için slash komutları eklendi (`src/Utils/slash.js`).
- **Discord lokalizasyonu:** Slash komutları, alt komutlar, seçenekler ve choice değerleri için `nameLocalizations` / `descriptionLocalizations` eklendi. Desteklenen tüm Discord locale’leri doldurulur; `tr` için Türkçe, diğer locale’ler için İngilizce fallback kullanılır.
- **Bilingual prefix alt komutlar:** Guard/setup/mod/yönetim komutlarında Türkçe ve İngilizce alt komut eşanlamlıları kabul edilir (örn. `aç/open`, `kapat/close`, `liste/list`, `bilgi/info`, `ceza/punish`, `politikalar/policies`, `uyarı/warning`).
- **Guard komutu sadeleştirme:** `guard` için daha kısa/anlaşılır kullanım, `durum` takma adı ve Türkçe sistem adları (örn. `rol`, `kanal`, `mesaj`) desteği eklendi.
- **Başlatma betikleri:** `baslat.bat`, `baslat-guard1.bat`, `baslat-guard2.bat`, `baslat-guard3.bat`, `baslat-snapshot.bat`, `baslat-ayri.bat` eklendi.
- **Owner ID’leri:** `.env` içindeki `OWNER_IDS` listesine ek ID’ler dahil edildi.

### Changed
- **README:** Detaylı komut kullanımı eklendi; README Türkçe + İngilizce bilingual yapıya çevrildi.
- **Presence:** Bot durumu `idle`, aktivite `Playing GIF STORY ❤️` olarak güncellendi.
- **Ayarlar politikaları çıktısı:** `ayarlar politikalar` ham JSON yerine okunabilir etiketli çıktı gösterir.
- **Safelist listeleme:** Listele butonu ve `safelist liste` çıktısı `<@id> (\`id\`)` biçiminde gösterilir.
- **Slash kayıt:** `ready` olayında global slash komutları `PUT Routes.applicationCommands` ile kaydedilir; eski duplicate komutlar değiştirilir.

### Fixed
- **Snapshot overwrite şeması:** `Snapshot` şemasında overwrite `type` alanı Mongoose `type` anahtar çakışması nedeniyle yanlış yorumlanıyordu; `type: { type: Number }` olarak düzeltildi ve snapshot doğrulama hatası giderildi.
- **Ban ID desteği:** `.ban` artık sunucuda olmayan kullanıcıları da ID ile yasaklayabilir; mevcut yasak kontrolü ve korumalı ID kontrolleri eklendi.
