# Quran Muallem 1.8.0 – Release Notes (versionCode 29)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Aufnahmen (`src/lib/recordingParts.ts`, `useTranscribingRecorder.cut`): Seitenwechsel, Sure-Ende und der Übergang in die nächste Sure schneiden die laufende Aufnahme ab und speichern sie einzeln — das Mikrofon läuft ohne Lücke weiter. Vorher wurde beim Umblättern nichts gespeichert und am Ende die ganze Aufnahme unter der letzten Seite abgelegt.
- Sure-Ende: 2 s Stille → Aufnahme stoppt selbst (Einstellung «بدء وإيقاف الجلسة»); weiter rezitieren → nächste Sure (im Tasmīʿ-Tab wechselt die Passage). Abschluss-Ton und Abzeichen erst nach dem Stopp (`src/lib/recordingActivity.ts`). Damit das Ende einer Sure in der Stille erkannt wird, bekommt die Zipformer-Erkennung jetzt 1,6 s jeder Pause (vorher 0,6 s).
- Getestet mit echter Erkennung im Browser (Alafasy: Al-Falaq + An-Nas, dann Stille): Mushaf und Tasmīʿ-Tab → zwei Aufnahmen (113: 23 s, 91–96 %; 114: 46 s, 93 %), Stopp nach 72 s (2 s nach dem letzten Wort), danach ein Abschluss-Ton.
- Koran-Text: ganzer Text gegen Quran.com Uthmani geprüft. Korrigiert: Versende-Zeichen von 84:21 (stand nach «قرئ»), 11:13 «ٱفْتَرَىٰهُ», 80:25 «أَنَّا», 27:26 unsichtbares Steuerzeichen. Test prüft alle 6236 Verse.
- Mushaf-Kopfzeile (Sure | Seite | Juz | Hizb, Lesezeichen, Suche, Einstellungen) und neues Gehe-zu-Blatt (zuletzt gelesen, Suren mit Auswendig-Fortschritt, Juz, Lesezeichen, Seite / Vers).
- Einstellungen in Gruppen wie bei Tarteel; neu: Vibration bei Fehlern, Auto-Stopp, Abschluss-Ton, erstes Wort im Auswendig-Modus zeigen, tägliche Wird-Erinnerung (nur App), alle Aufnahmen löschen.
- Android: eigener Download (HttpURLConnection) und eigener Player (MediaPlayer im Vordergrund-Dienst) für die Rezitatoren-Bibliothek. Nach `npm install` → `node scripts/native-permissions.mjs` → `npx cap sync` neu bauen; auf einem echten Gerät noch nicht getestet.

```
<en-US>
Quran Muallem 1.8.0
• Recording across pages and surahs: each page / surah is saved as its own recording, nothing is overwritten
• Recite on into the next surah – An-Naba, An-Nazi'at, 'Abasa are split automatically
• At a surah end the mic stops after 2 s of silence; sound and badges come after the stop
• New Mushaf header (surah | page | juz | hizb) with recently read, juz and bookmarks
• 84:21 fixed
• Settings regrouped
• Android: native downloads and background player
</en-US>

<de-DE>
Quran Muallem 1.8.0
• Aufnahme über Seiten und Suren: jede Seite / Sure wird einzeln gespeichert, nichts wird überschrieben
• Weiter in die nächste Sure – An-Naba, An-Nazi'at, 'Abasa werden getrennt
• Am Sure-Ende stoppt das Mikro nach 2 s Stille; Ton und Abzeichen erst danach
• Neue Mushaf-Kopfzeile (Sure | Seite | Juz | Hizb) mit Zuletzt gelesen, Juz, Lesezeichen
• 84:21 korrigiert
• Einstellungen neu gegliedert
• Android: eigene Downloads und Hintergrund-Player
</de-DE>

<ar>
معلم القرآن 1.8.0
• تسجيل عبر الصفحات والسور: تُحفظ كل صفحة وسورة في تسجيل مستقل دون استبدال السابق
• واصل التلاوة إلى السورة التالية — النبأ، النازعات، عبس تُفصل تلقائيًا
• في نهاية السورة يتوقف الميكروفون بعد ثانيتين من الصمت، والصوت والشارات بعد الإيقاف
• شريط علوي جديد للمصحف (السورة | الصفحة | الجزء | الحزب) مع «قرأت مؤخرًا» والأجزاء والإشارات المرجعية
• تصحيح الآية ٢١ من الانشقاق
• إعدادات مرتبة في أقسام
• أندرويد: تنزيل ومشغّل أصلي في الخلفية
</ar>

<fr-FR>
Quran Muallem 1.8.0
• Enregistrement sur plusieurs pages et sourates : chaque page / sourate est gardée à part, rien n'est écrasé
• Continuez dans la sourate suivante : découpage automatique
• En fin de sourate, le micro s'arrête après 2 s de silence ; son et badges ensuite
• Nouvelle barre du Mushaf (sourate | page | juz | hizb), lus récemment, juz, marque-pages
• 84:21 corrigé
• Réglages regroupés
• Android : téléchargements et lecteur natifs
</fr-FR>

<tr-TR>
Quran Muallem 1.8.0
• Sayfalar ve sureler boyunca kayıt: her sayfa / sure ayrı kaydedilir, hiçbir şey üzerine yazılmaz
• Sonraki sureye devam et – sureler otomatik ayrılır
• Sure sonunda mikrofon 2 sn sessizlikten sonra durur; ses ve rozetler ardından gelir
• Yeni Mushaf başlığı (sure | sayfa | cüz | hizb), son okunanlar, cüzler, işaretler
• 84:21 düzeltildi
• Ayarlar yeniden düzenlendi
• Android: yerel indirme ve arka plan oynatıcı
</tr-TR>

<ur>
قرآن معلم 1.8.0
• صفحات اور سورتوں میں مسلسل ریکارڈنگ: ہر صفحہ / سورت الگ محفوظ، کچھ اوور رائٹ نہیں ہوتا
• اگلی سورت میں جاری رکھیں — سورتیں خود الگ ہو جاتی ہیں
• سورت کے آخر میں ٢ سیکنڈ خاموشی کے بعد مائیک رک جاتا ہے؛ آواز اور بیج اس کے بعد
• مصحف کی نئی بالائی پٹی (سورت | صفحہ | پارہ | حزب)، حال ہی میں پڑھا، پارے، بُک مارکس
• ٨٤:٢١ درست
• ترتیبات نئے انداز میں
• اینڈرائیڈ: مقامی ڈاؤن لوڈ اور بیک گراؤنڈ پلیئر
</ur>

<id>
Quran Muallem 1.8.0
• Rekaman lintas halaman dan surah: tiap halaman / surah disimpan terpisah, tidak ada yang tertimpa
• Lanjut ke surah berikutnya – surah dipisah otomatis
• Di akhir surah mikrofon berhenti setelah 2 detik hening; suara dan lencana sesudahnya
• Header Mushaf baru (surah | halaman | juz | hizb), terakhir dibaca, juz, penanda
• 84:21 diperbaiki
• Pengaturan ditata ulang
• Android: unduhan dan pemutar latar asli
</id>

<ms>
Quran Muallem 1.8.0
• Rakaman merentas halaman dan surah: setiap halaman / surah disimpan berasingan, tiada yang ditimpa
• Teruskan ke surah seterusnya – surah dipisahkan automatik
• Di akhir surah mikrofon berhenti selepas 2 saat senyap; bunyi dan lencana selepas itu
• Pengepala Mushaf baharu (surah | halaman | juz | hizb), baru dibaca, juz, penanda
• 84:21 dibetulkan
• Tetapan disusun semula
• Android: muat turun dan pemain latar asli
</ms>

<es-ES>
Quran Muallem 1.8.0
• Grabación a través de páginas y suras: cada página / sura se guarda aparte, nada se sobrescribe
• Sigue con la siguiente sura: se separan solas
• Al final de la sura el micrófono se detiene tras 2 s de silencio; sonido e insignias después
• Nueva cabecera del Mushaf (sura | página | yuz | hizb), leído recientemente, yuz, marcadores
• 84:21 corregido
• Ajustes reorganizados
• Android: descargas y reproductor nativos
</es-ES>

<ru-RU>
Quran Muallem 1.8.0
• Запись через страницы и суры: каждая страница / сура сохраняется отдельно, ничего не перезаписывается
• Продолжайте следующую суру — суры разделяются сами
• В конце суры микрофон выключается после 2 с тишины; звук и значки — потом
• Новая шапка Мусхафа (сура | страница | джуз | хизб), недавнее, джузы, закладки
• Исправлен аят 84:21
• Настройки по разделам
• Android: нативные загрузки и фоновый плеер
</ru-RU>

<bn-BD>
Quran Muallem 1.8.0
• পৃষ্ঠা ও সূরা জুড়ে রেকর্ডিং: প্রতিটি পৃষ্ঠা / সূরা আলাদা সংরক্ষিত, কিছুই মুছে যায় না
• পরের সূরায় চালিয়ে যান — সূরা নিজে আলাদা হয়
• সূরার শেষে ২ সেকেন্ড নীরবতার পর মাইক থামে; শব্দ ও ব্যাজ পরে
• মুসহাফের নতুন হেডার (সূরা | পৃষ্ঠা | পারা | হিযব), সম্প্রতি পড়া, পারা, বুকমার্ক
• ৮৪:২১ সংশোধিত
• সেটিংস নতুনভাবে সাজানো
• অ্যান্ড্রয়েড: নিজস্ব ডাউনলোড ও ব্যাকগ্রাউন্ড প্লেয়ার
</bn-BD>

<sq>
Quran Muallem 1.8.0
• Regjistrim nëpër faqe e sure: çdo faqe / sure ruhet veç, asgjë nuk mbishkruhet
• Vazhdo në suren tjetër – suret ndahen vetë
• Në fund të sures mikrofoni ndalon pas 2 s heshtje; tingulli dhe distinktivët pas kësaj
• Kokë e re e Mus'hafit (sure | faqe | xhuz | hizb), lexuar së fundi, xhuzet, shënimet
• 84:21 u korrigjua
• Cilësimet të rirregulluara
• Android: shkarkime dhe luajtës vendas
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.8.0
• Snimanje kroz stranice i sure: svaka stranica / sura se čuva posebno, ništa se ne prepisuje
• Nastavi u sljedeću suru – sure se same razdvajaju
• Na kraju sure mikrofon staje nakon 2 s tišine; zvuk i značke tek tada
• Novo zaglavlje Mushafa (sura | stranica | džuz | hizb), nedavno čitano, džuzovi, oznake
• 84:21 ispravljen
• Postavke preuređene
• Android: vlastita preuzimanja i plejer u pozadini
```
