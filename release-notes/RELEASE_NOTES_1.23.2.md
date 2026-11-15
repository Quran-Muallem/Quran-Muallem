# Quran Muallem 1.23.2 – Release Notes (versionCode 61)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Datenschutzerklärung (en/ar) neu gefasst, Stand 15.11.2026: Mikrofon im Hintergrund (Vordergrund-Dienst mit Benachrichtigung), Bewegungssensoren im Gebetsbegleiter (nur im Moment ausgewertet, nicht gespeichert), Kindermodus, Vorlesen über die Sprachausgabe des Geräts, automatische Suren-Erkennung (offline), Fehlernotiz `qm.lastCrash` (nur lokal), alle Dienste (Quran.com inkl. Tajweed-Farben, mp3quran inkl. Verbindungstest, GitHub Pages für die Web-Version), Menüpfade unter Einstellungen → Datenschutz. `npm run legal` erzeugt `src/lib/legalTexts.ts` und `public/legal/*.html`.
- Behoben: «Alle meine Daten löschen» (`src/lib/dataReset.ts`) entfernte nur `hifz.*`-Schlüssel; jetzt auch `qm.*` / `qm_*` (u. a. Gebetsstandort `qm.prayer.settings.v1`, Kindersterne, Geschichten, Favoriten, Absturznotiz).

```
<en-US>
• Updated privacy policy (microphone in the background, motion sensors in the Salat Companion, Kids Mode, read-aloud, all services used)
• «Delete all my data» now really removes everything, incl. prayer location, kids stars, stories and favourites
</en-US>

<de-DE>
• Datenschutzerklärung aktualisiert (Mikrofon im Hintergrund, Bewegungssensoren im Gebetsbegleiter, Kindermodus, Vorlesen, alle genutzten Dienste)
• «Alle meine Daten löschen» entfernt jetzt wirklich alles, auch Gebetsstandort, Kindersterne, Geschichten und Favoriten
</de-DE>

<ar>
• تحديث سياسة الخصوصية (الميكروفون في الخلفية، مستشعرات الحركة في رفيق الصلاة، وضع الأطفال، القراءة الصوتية، جميع الخدمات المستخدمة)
• «حذف جميع بياناتي» يحذف الآن كل شيء فعلًا، ومنه موقع الصلاة ونجوم الأطفال والقصص والمفضّلة
</ar>

<fr-FR>
• Politique de confidentialité mise à jour (micro en arrière-plan, capteurs de mouvement du compagnon de prière, mode enfants, lecture à voix haute, tous les services utilisés)
• «Supprimer toutes mes données» supprime désormais tout, y compris le lieu de prière, les étoiles des enfants, les histoires et les favoris
</fr-FR>

<tr-TR>
• Gizlilik politikası güncellendi (arka planda mikrofon, namaz arkadaşında hareket sensörleri, çocuk modu, sesli okuma, kullanılan tüm servisler)
• «Tüm verilerimi sil» artık namaz konumu, çocuk yıldızları, hikâyeler ve favoriler dahil gerçekten her şeyi siler
</tr-TR>

<ur>
• رازداری کی پالیسی اپ ڈیٹ (پس منظر میں مائیکروفون، نماز کے ساتھی میں حرکت کے سینسر، بچوں کا موڈ، بلند آواز پڑھنا، تمام استعمال شدہ سروسز)
• «میرا سارا ڈیٹا حذف کریں» اب واقعی سب کچھ حذف کرتا ہے، نماز کا مقام، بچوں کے ستارے، کہانیاں اور پسندیدہ بھی
</ur>

<id>
• Kebijakan privasi diperbarui (mikrofon di latar belakang, sensor gerak di Pendamping Salat, Mode Anak, baca keras, semua layanan yang dipakai)
• «Hapus semua data saya» kini benar-benar menghapus semuanya, termasuk lokasi salat, bintang anak, cerita dan favorit
</id>

<ms>
• Dasar privasi dikemas kini (mikrofon di latar belakang, penderia gerakan dalam Teman Solat, Mod Kanak-kanak, bacaan suara, semua perkhidmatan yang digunakan)
• «Padam semua data saya» kini benar-benar memadam semuanya, termasuk lokasi solat, bintang kanak-kanak, cerita dan kegemaran
</ms>

<es-ES>
• Política de privacidad actualizada (micrófono en segundo plano, sensores de movimiento en el compañero de oración, modo infantil, lectura en voz alta, todos los servicios usados)
• «Borrar todos mis datos» ahora borra todo de verdad, incluida la ubicación de oración, las estrellas infantiles, las historias y los favoritos
</es-ES>

<ru-RU>
• Обновлена политика конфиденциальности (микрофон в фоне, датчики движения в помощнике намаза, детский режим, озвучивание, все используемые сервисы)
• «Удалить все мои данные» теперь действительно удаляет всё, включая место молитвы, детские звёзды, истории и избранное
</ru-RU>

<bn-BD>
• গোপনীয়তা নীতি হালনাগাদ (পটভূমিতে মাইক্রোফোন, সালাত সঙ্গীতে গতি সেন্সর, শিশু মোড, জোরে পড়া, ব্যবহৃত সব সেবা)
• «আমার সব ডেটা মুছুন» এখন সত্যিই সব মুছে দেয়, নামাজের অবস্থান, শিশুদের তারা, গল্প ও প্রিয়সহ
</bn-BD>

<sq>
• Politika e privatësisë u përditësua (mikrofoni në sfond, sensorët e lëvizjes te shoqëruesi i namazit, modaliteti për fëmijë, leximi me zë, të gjitha shërbimet e përdorura)
• «Fshi të gjitha të dhënat e mia» tani fshin vërtet gjithçka, edhe vendndodhjen e namazit, yjet e fëmijëve, tregimet dhe të preferuarat
</sq>
```

Bosnisch (Website / Social Media):

```
• Ažurirana politika privatnosti (mikrofon u pozadini, senzori pokreta u pratiocu namaza, dječiji način, čitanje naglas, sve korištene usluge)
• «Obriši sve moje podatke» sada zaista briše sve, uključujući lokaciju namaza, dječije zvijezde, priče i favorite
```
