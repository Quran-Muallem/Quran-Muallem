# Quran Muallem 1.6 – Release Notes (versionCode 26)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Duas & Adhkar: vollständiges „Hisn al-Muslim“ (Sa'id al-Qahtani; der Autor erlaubt die kostenlose Verbreitung). Arabischer Text, Lautschrift und englische Übersetzung: hisnmuslim.com; arabische Quellenangaben: github.com/rn0x/hisn_almuslim_json (ohne Lizenzdatei). Deutsche Übersetzung gibt es dort nicht → Englisch.
- iOS: `node scripts/native-permissions.mjs` setzt jetzt die AVAudioSession (Wiedergabe + andere Apps leiser) in `AppDelegate.swift`; danach `npx cap sync ios`.
- Android: Adhan-Kanäle aller Muezzin-Stimmen werden beim App-Start angelegt. `USE_EXACT_ALARM` weiterhin nicht eingetragen (Play-Richtlinie).
- Adhan-Aufnahmen aus 1.2: Nutzungsrechte bestätigen; Makkah, al-Aqsa, Abdul Basit fehlen weiter.

```
<en-US>
Quran Muallem 1.6
• New: all adhkar & duas (complete Hisn al-Muslim) – search, favourites, categories, detail view with transliteration, translation, source, counter and sharing
• Recording in the Mushaf now turns pages automatically until you stop it
• Reciter downloads: progress bar with % and MB on Android too
• Adhan with the app open: full Adhan instead of the short sound; iOS audio improved
• Go To: surah search on top
</en-US>

<de-DE>
Quran Muallem 1.6
• Neu: alle Adhkar & Duas (vollständiges Hisn al-Muslim) – Suche, Favoriten, Kategorien, Detailansicht mit Lautschrift, Übersetzung, Quelle, Zähler und Teilen
• Aufnahme im Mushaf blättert jetzt automatisch weiter, bis du stoppst
• Rezitatoren-Downloads: Fortschrittsbalken mit % und MB auch auf Android
• Adhan bei offener App: voller Adhan statt kurzem Ton; iOS-Audio verbessert
• Gehe zu: Suren-Suche oben
</de-DE>

<ar>
معلم القرآن 1.6
• جديد: كل الأذكار والأدعية (حصن المسلم كاملًا) — بحث ومفضلة وأقسام، وصفحة لكل ذكر بالنطق والترجمة والمصدر والعدّاد والمشاركة
• التسجيل في المصحف ينتقل إلى الصفحة التالية تلقائيًا حتى توقفه
• تنزيل التلاوات: شريط تقدم بالنسبة والميغابايت على أندرويد أيضًا
• الأذان والتطبيق مفتوح: أذان كامل بدل النغمة القصيرة، وتحسين الصوت على iOS
• انتقل إلى: البحث عن السورة في الأعلى
</ar>

<fr-FR>
Quran Muallem 1.6
• Nouveau : tous les adhkar et douas (Hisn al-Muslim complet) – recherche, favoris, catégories, fiche avec translittération, traduction, source, compteur et partage
• L’enregistrement dans le Mushaf tourne les pages tout seul jusqu’à l’arrêt
• Téléchargements : barre de progression avec % et Mo aussi sur Android
• Adhan appli ouverte : adhan complet ; audio iOS amélioré
• Aller à : recherche de sourate en haut
</fr-FR>

<tr-TR>
Quran Muallem 1.6
• Yeni: tüm zikir ve dualar (Hısnu’l-Müslim’in tamamı) – arama, favoriler, kategoriler; okunuş, çeviri, kaynak, sayaç ve paylaşım içeren ayrıntı sayfası
• Mushaf’ta kayıt, sen durdurana kadar sayfaları kendisi çevirir
• Kâri indirmeleri: Android’de de % ve MB ilerleme çubuğu
• Uygulama açıkken tam ezan; iOS sesi iyileştirildi
• Git: sure araması en üstte
</tr-TR>

<ur>
قرآن معلم 1.6
• نیا: تمام اذکار و دعائیں (مکمل حصن المسلم) — تلاش، پسندیدہ، زمرے، اور ہر ذکر کا صفحہ تلفظ، ترجمہ، حوالہ، گنتی اور شیئر کے ساتھ
• مصحف میں ریکارڈنگ رکنے تک خود صفحہ پلٹتی ہے
• قراء کے ڈاؤن لوڈ: اینڈرائیڈ پر بھی % اور MB کے ساتھ پیش رفت بار
• ایپ کھلی ہو تو مکمل اذان؛ iOS آواز بہتر
• جائیں: سورت کی تلاش اوپر
</ur>

<id>
Quran Muallem 1.6
• Baru: semua zikir & doa (Hisnul Muslim lengkap) – pencarian, favorit, kategori, halaman detail dengan transliterasi, terjemahan, sumber, penghitung, dan berbagi
• Rekaman di mushaf membalik halaman otomatis sampai kamu berhenti
• Unduhan qari: bilah progres dengan % dan MB juga di Android
• Azan saat aplikasi terbuka: azan penuh; audio iOS diperbaiki
• Pergi ke: pencarian surah di atas
</id>

<ms>
Quran Muallem 1.6
• Baharu: semua zikir & doa (Hisnul Muslim lengkap) – carian, kegemaran, kategori, halaman butiran dengan transliterasi, terjemahan, sumber, pengira dan kongsi
• Rakaman dalam mushaf menyelak halaman sendiri sehingga anda berhenti
• Muat turun qari: bar kemajuan dengan % dan MB juga di Android
• Azan ketika aplikasi dibuka: azan penuh; audio iOS dipertingkat
• Pergi ke: carian surah di atas
</ms>

<es-ES>
Quran Muallem 1.6
• Nuevo: todos los adhkar y duas (Hisn al-Muslim completo): búsqueda, favoritos, categorías, ficha con transliteración, traducción, fuente, contador y compartir
• La grabación en el Mushaf pasa las páginas sola hasta que la detengas
• Descargas: barra de progreso con % y MB también en Android
• Adhan con la app abierta: adhan completo; audio de iOS mejorado
• Ir a: búsqueda de sura arriba
</es-ES>

<ru-RU>
Quran Muallem 1.6
• Новое: все азкары и дуа (полный «Хисн аль-муслим») — поиск, избранное, разделы, страница с транслитерацией, переводом, источником, счётчиком и «поделиться»
• Запись в мусхафе сама листает страницы, пока вы её не остановите
• Загрузки: шкала с % и МБ и на Android
• Азан при открытом приложении — полностью; звук на iOS улучшен
• Перейти: поиск суры наверху
</ru-RU>

<bn-BD>
Quran Muallem 1.6
• নতুন: সব জিকির ও দোয়া (সম্পূর্ণ হিসনুল মুসলিম) — খোঁজা, প্রিয়, বিভাগ, উচ্চারণ, অনুবাদ, সূত্র, কাউন্টার ও শেয়ারসহ বিস্তারিত পাতা
• মুসহাফে রেকর্ডিং থামানো পর্যন্ত নিজে পাতা উল্টায়
• ডাউনলোড: অ্যান্ড্রয়েডেও % ও MB সহ অগ্রগতি বার
• অ্যাপ খোলা থাকলে পূর্ণ আজান; iOS অডিও উন্নত
• যান: সূরা খোঁজা উপরে
</bn-BD>

<sq>
Quran Muallem 1.6
• E re: të gjitha dhikret e lutjet (Hisnul Muslim i plotë) – kërkim, të preferuara, kategori, faqe me transliterim, përkthim, burim, numërues dhe ndarje
• Regjistrimi në Mushaf kthen faqet vetë derisa ta ndalosh
• Shkarkimet: shirit ecurie me % dhe MB edhe në Android
• Ezan i plotë me aplikacionin të hapur; audio iOS e përmirësuar
• Shko te: kërkimi i sures sipër
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.6
• Novo: svi zikrovi i dove (kompletan Hisnul-muslim) – pretraga, omiljeni, kategorije, stranica s transliteracijom, prijevodom, izvorom, brojačem i dijeljenjem
• Snimanje u mushafu samo okreće stranice dok ga ne zaustaviš
• Preuzimanja: traka napretka s % i MB i na Androidu
• Ezan dok je aplikacija otvorena: cijeli ezan; iOS zvuk poboljšan
• Idi na: pretraga sura na vrhu
```
