# Quran Muallem 1.9.0 – Release Notes (versionCode 30)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Aufnahmen (`MushafReader` `collect` / `flush`, `src/lib/recordingParts.ts` `addToOpen`): beim Umblättern wird nichts mehr geschnitten; die Verse jeder Seite kommen in den offenen Teil ihrer Sure. Gespeichert wird am Sure-Ende, beim Übergang in die nächste Sure und beim Stopp → eine Aufnahme pro Sure mit vollem Bereich. Ursache des Fehlers in 1.8.0: beim Umblättern wurde `takeAudio` statt `cut` aufgerufen (Flag zu früh zurückgesetzt), die Verse der ersten Seite galten als gespeichert, der Ton fehlte.
- Getestet mit echter Erkennung im Browser: Al-Balad (Alafasy, Seite 594 → 595) → eine Aufnahme 90:1–20, 104 s, 95 %; Al-Falaq + An-Nas weiterhin zwei getrennte Aufnahmen.
- Einstellungen: Rezitation (Erklärung Lesen/Auswendig, Fehlererkennung), Zuhören (Sheikh-Auswahl, Downloads verwalten, Tempo 0,5–1,75 inkl. nativer Player), Hervorhebung (frühere Fehler), Fehler (Hinweis bei ausgeschalteter Erkennung, Ton mit Auswahl, Vibration), Start/Stopp (Ton, Vibration, Auto-Stopp, Abschluss-Ton), Datennutzung (Aufnahmen behalten; Hinweis: kein KI-Training), Aufnahmen löschen (Liste der Folgen, „استمر“ / „ليس الآن“), „حذف جميع بياناتي“ als eigene Zeile.
- Nicht umgesetzt (dafür fehlen Daten / Funktionen in der App): Lesemodi „Koran-Text“ und „Lautschrift“, Schriftgröße, Mushaf-Varianten (1441, Indo-Pak), Tajweed-Farben, Mutashabihat, Verbindungsabbruch-Töne, Testmodus-Töne, KI-Trainings-Einwilligung (es wird nichts gesendet).
- Übersetzung/Tafsir: Liste wird direkt in der Einstellungs-Seite gezeigt (vorher ein Overlay im Dialog, das abgeschnitten wurde).
- Rezitatoren: Abspielen bricht nach 20 s ohne Start mit Meldung ab; fehlgeschlagene Downloads zeigen den Grund; „Verbinde …“ statt „0.0 MB“.

```
<en-US>
Quran Muallem 1.9.0
• A surah over several pages is now ONE recording with its full range (e.g. Al-Balad verse 1 to 20) – the first page is no longer lost
• Settings completed: error detection, playback speed, manage downloads, past mistakes, mistake sound, start/stop sound & vibration, keep recordings, delete all recordings / all my data
• Translation & tafsir lists fit the screen
• New Mushaf header and Go-To (surah search first)
• Clear message when the recitation server cannot be reached
</en-US>

<de-DE>
Quran Muallem 1.9.0
• Eine Sure über mehrere Seiten ist jetzt EINE Aufnahme mit ganzem Bereich (z. B. Al-Balad Vers 1 bis 20) – die erste Seite geht nicht mehr verloren
• Einstellungen ergänzt: Fehlererkennung, Tempo, Downloads, frühere Fehler, Fehlerton, Start/Stopp-Ton & Vibration, Aufnahmen behalten, alles löschen
• Übersetzungs- und Tafsir-Liste passen auf den Bildschirm
• Neue Mushaf-Kopfzeile und Gehe-zu (Suren-Suche zuerst)
• Klare Meldung, wenn der Server nicht erreichbar ist
</de-DE>

<ar>
معلم القرآن 1.9.0
• السورة الممتدة على عدة صفحات صارت تسجيلًا واحدًا بنطاقها الكامل (مثل البلد من الآية ١ إلى ٢٠) — لم تعد الصفحة الأولى تضيع
• اكتمال الإعدادات: كشف الأخطاء، سرعة التلاوة، إدارة التنزيلات، الأخطاء الماضية، صوت الخطأ، صوت واهتزاز البدء والإيقاف، حفظ التسجيلات، حذف التسجيلات أو كل البيانات
• قوائم الترجمة والتفسير تناسب الشاشة
• شريط علوي جديد للمصحف و«اذهب إلى» بالبحث عن السورة أولًا
• رسالة واضحة عند تعذّر الوصول إلى خادم التلاوات
</ar>

<fr-FR>
Quran Muallem 1.9.0
• Une sourate sur plusieurs pages = UN enregistrement complet (ex. Al-Balad versets 1 à 20) ; la première page n'est plus perdue
• Réglages complétés : détection des erreurs, vitesse, téléchargements, erreurs passées, son d'erreur, son et vibration début/fin, garder les enregistrements, tout supprimer
• Listes traduction et tafsir adaptées à l'écran
• Nouvel en-tête du Mushaf et « Aller à » (recherche de sourate d'abord)
• Message clair si le serveur est injoignable
</fr-FR>

<tr-TR>
Quran Muallem 1.9.0
• Birden çok sayfaya yayılan sure artık TEK kayıt ve tam aralık (ör. Beled 1–20. ayet); ilk sayfa kaybolmuyor
• Ayarlar tamamlandı: hata tespiti, oynatma hızı, indirmeleri yönet, geçmiş hatalar, hata sesi, başlat/durdur sesi ve titreşimi, kayıtları sakla, tümünü sil
• Meal ve tefsir listeleri ekrana sığıyor
• Yeni Mushaf başlığı ve Git (önce sure araması)
• Tilavet sunucusuna ulaşılamazsa net mesaj
</tr-TR>

<ur>
قرآن معلم 1.9.0
• کئی صفحات پر پھیلی سورت اب ایک ہی ریکارڈنگ ہے پوری حد کے ساتھ (مثلاً البلد آیت ١ تا ٢٠) — پہلا صفحہ ضائع نہیں ہوتا
• ترتیبات مکمل: غلطیوں کی نشاندہی، رفتار، ڈاؤن لوڈز، پچھلی غلطیاں، غلطی کی آواز، شروع/بند کی آواز و ارتعاش، ریکارڈنگز محفوظ، سب حذف
• ترجمہ اور تفسیر کی فہرستیں اسکرین میں فٹ
• مصحف کی نئی بالائی پٹی اور «جائیں» (پہلے سورت تلاش)
• تلاوت سرور نہ ملنے پر واضح پیغام
</ur>

<id>
Quran Muallem 1.9.0
• Surah yang melintasi beberapa halaman kini SATU rekaman dengan rentang penuh (mis. Al-Balad ayat 1–20); halaman pertama tidak hilang lagi
• Pengaturan lengkap: deteksi kesalahan, kecepatan, kelola unduhan, kesalahan lalu, suara salah, suara & getar mulai/henti, simpan rekaman, hapus semua
• Daftar terjemahan dan tafsir pas di layar
• Header Mushaf baru dan Buka (cari surah dulu)
• Pesan jelas bila server bacaan tak terjangkau
</id>

<ms>
Quran Muallem 1.9.0
• Surah merentas beberapa halaman kini SATU rakaman dengan julat penuh (cth. Al-Balad ayat 1–20); halaman pertama tidak hilang lagi
• Tetapan lengkap: pengesanan kesilapan, kelajuan, urus muat turun, kesilapan lalu, bunyi salah, bunyi & getaran mula/henti, simpan rakaman, padam semua
• Senarai terjemahan dan tafsir muat skrin
• Pengepala Mushaf baharu dan Pergi (cari surah dahulu)
• Mesej jelas jika pelayan bacaan tidak dapat dicapai
</ms>

<es-ES>
Quran Muallem 1.9.0
• Una sura en varias páginas es ahora UNA grabación con todo su rango (p. ej. Al-Balad 1 a 20); la primera página ya no se pierde
• Ajustes completos: detección de errores, velocidad, descargas, errores anteriores, sonido de error, sonido y vibración al iniciar/parar, guardar grabaciones, borrar todo
• Listas de traducción y tafsir caben en pantalla
• Nueva cabecera del Mushaf e Ir a (búsqueda de sura primero)
• Aviso claro si el servidor no responde
</es-ES>

<ru-RU>
Quran Muallem 1.9.0
• Сура на нескольких страницах — теперь ОДНА запись с полным диапазоном (напр. аль-Балад 1–20); первая страница больше не теряется
• Настройки дополнены: распознавание ошибок, скорость, загрузки, прошлые ошибки, звук ошибки, звук и вибрация старта/стопа, хранить записи, удалить всё
• Списки переводов и тафсиров помещаются на экран
• Новая шапка Мусхафа и «Перейти» (сначала поиск суры)
• Понятное сообщение, если сервер недоступен
</ru-RU>

<bn-BD>
Quran Muallem 1.9.0
• কয়েক পৃষ্ঠার সূরা এখন একটি রেকর্ডিং পূর্ণ পরিসরসহ (যেমন আল-বালাদ ১–২০); প্রথম পৃষ্ঠা আর হারায় না
• সেটিংস সম্পূর্ণ: ভুল শনাক্ত, গতি, ডাউনলোড, আগের ভুল, ভুলের শব্দ, শুরু/বন্ধের শব্দ ও কম্পন, রেকর্ডিং রাখা, সব মুছুন
• অনুবাদ ও তাফসীর তালিকা স্ক্রিনে মানানসই
• মুসহাফের নতুন হেডার ও «যান» (আগে সূরা খোঁজ)
• সার্ভারে পৌঁছানো না গেলে স্পষ্ট বার্তা
</bn-BD>

<sq>
Quran Muallem 1.9.0
• Një sure në disa faqe tani është NJË regjistrim me gjithë shtrirjen (p.sh. El-Beled 1–20); faqja e parë nuk humbet më
• Cilësimet të plota: zbulimi i gabimeve, shpejtësia, shkarkimet, gabimet e kaluara, tingulli i gabimit, tingull e dridhje fillimi/ndalimi, ruaj regjistrimet, fshi gjithçka
• Listat e përkthimit dhe tefsirit përshtaten në ekran
• Kokë e re e Mus'hafit dhe «Shko te» (së pari kërkimi i sures)
• Mesazh i qartë kur serveri nuk arrihet
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.9.0
• Sura na više stranica sada je JEDAN snimak s punim rasponom (npr. El-Beled 1–20); prva stranica se više ne gubi
• Postavke dopunjene: otkrivanje grešaka, brzina, preuzimanja, ranije greške, zvuk greške, zvuk i vibracija start/stop, čuvaj snimke, obriši sve
• Liste prijevoda i tefsira staju na ekran
• Novo zaglavlje Mushafa i „Idi na“ (prvo pretraga sure)
• Jasna poruka kad server nije dostupan
```
