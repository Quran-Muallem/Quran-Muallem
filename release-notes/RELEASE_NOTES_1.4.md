# Quran Muallem 1.4 – Release Notes (versionCode 24)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Neue native Plugins: `@capacitor/file-transfer` (Suren-Downloads direkt in eine Datei) und `@capgo/capacitor-media-session` → nach `npm install` einmal `npx cap sync`.
- Rezitatoren-Audio und Vers-Zeiten: mp3quran.net (freie API, Quelle in der App genannt).
- Android: Adhan nutzt `SCHEDULE_EXACT_ALARM` (Nutzer erlaubt „Wecker und Erinnerungen“ in der App). `USE_EXACT_ALARM` bewusst NICHT eingetragen – Google Play erlaubt das nur für Wecker-/Kalender-Apps (Ablehnungsrisiko).
- Ibn Kathir (Ilm Verlag) auf Deutsch weiterhin nur mit Lizenz.
- Adhan-Aufnahmen aus 1.2 (Qassas, Alafasy): Nutzungsrechte vor der Veröffentlichung bestätigen; Makkah, al-Aqsa, Abdul Basit fehlen noch.

```
<en-US>
Quran Muallem 1.4
• New: Reciters (More tab) – 86 Sheikhs in all riwayat (Hafs, Warsh, Qalun, Shu'ba …), search, favourites, offline download with progress
• Surah playback continues to the next surah; lock screen «Sheikh | Surah», verse by verse forward/back, artwork and timeline
• Adhan planned 7 days ahead, also when the app stays closed; exact-alarm setting on Android
• Go To: surah search also by meaning (e.g. "The Cow")
</en-US>

<de-DE>
Quran Muallem 1.4
• Neu: Rezitatoren (Tab „Mehr“) – 86 Scheichs in allen Riwayat (Hafs, Warsch, Qalun, Schu'ba …), Suche, Favoriten, Offline-Download mit Fortschritt
• Suren laufen weiter zur nächsten Sure; Sperrbildschirm „Scheich | Sure“, Vers vor/zurück, Bild und Zeitleiste
• Adhan 7 Tage im Voraus geplant, auch wenn die App geschlossen bleibt; Android: pünktliche Wecker
• Gehe zu: Sure auch nach deutscher Bedeutung suchen (z. B. „Die Kuh“)
</de-DE>

<ar>
معلم القرآن 1.4
• جديد: المقرئين في «المزيد» — ٨٦ قارئًا بجميع الروايات (حفص، ورش، قالون، شعبة…) مع البحث والمفضلة والتنزيل مع نسبة التقدم
• التلاوة تنتقل إلى السورة التالية تلقائيًا، وشاشة القفل «بصوت الشيخ… | سورة…» مع الآية السابقة/التالية والصورة وشريط التقدم
• جدولة الأذان لسبعة أيام حتى والتطبيق مغلق، وإعداد المنبّهات الدقيقة في أندرويد
• انتقل إلى: البحث عن السورة بمعناها أيضًا
</ar>

<fr-FR>
Quran Muallem 1.4
• Nouveau : Récitateurs (onglet Plus) – 86 cheikhs dans toutes les riwayat (Hafs, Warsh, Qalun, Shu'ba …), recherche, favoris, téléchargement avec progression
• La lecture passe à la sourate suivante ; écran verrouillé « Cheikh | Sourate », verset précédent/suivant, image et barre de temps
• Adhan planifié 7 jours à l’avance, même appli fermée ; alarmes exactes sur Android
• Aller à : recherche par sens (ex. « La vache »)
</fr-FR>

<tr-TR>
Quran Muallem 1.4
• Yeni: Kâriler («Daha fazla») – tüm rivayetlerde 86 şeyh (Hafs, Verş, Kalun, Şu'be …), arama, favoriler, ilerlemeli indirme
• Sure bitince sonraki sureye geçer; kilit ekranında «Şeyh | Sure», önceki/sonraki ayet, görsel ve zaman çizgisi
• Ezan, uygulama kapalı kalsa da 7 gün önceden planlanır; Android’de tam zamanlı alarm ayarı
• Git: sureyi anlamıyla da ara
</tr-TR>

<ur>
قرآن معلم 1.4
• نیا: قراء («مزید» میں) — تمام روایات میں 86 قراء (حفص، ورش، قالون، شعبہ…)، تلاش، پسندیدہ، پیش رفت کے ساتھ ڈاؤن لوڈ
• تلاوت اگلی سورت پر خود چلتی ہے؛ لاک اسکرین «شیخ | سورت»، پچھلی/اگلی آیت، تصویر اور ٹائم لائن
• اذان 7 دن پہلے سے طے، ایپ بند رہے تب بھی؛ اینڈرائیڈ پر عین وقت کے الارم
• جائیں: سورت کو معنی سے بھی تلاش کریں
</ur>

<id>
Quran Muallem 1.4
• Baru: Qari (tab Lainnya) – 86 syekh dalam semua riwayat (Hafs, Warsy, Qalun, Syu'bah …), pencarian, favorit, unduhan dengan progres
• Pemutaran lanjut ke surah berikutnya; layar kunci «Syekh | Surah», ayat sebelumnya/berikutnya, gambar dan lini waktu
• Azan dijadwalkan 7 hari ke depan, meski aplikasi tetap tertutup; alarm tepat di Android
• Pergi ke: cari surah juga dari artinya
</id>

<ms>
Quran Muallem 1.4
• Baharu: Qari (tab Lagi) – 86 syeikh dalam semua riwayat (Hafs, Warsy, Qalun, Syu'bah …), carian, kegemaran, muat turun dengan kemajuan
• Main balik terus ke surah seterusnya; skrin kunci «Syeikh | Surah», ayat sebelum/seterusnya, gambar dan garis masa
• Azan dijadualkan 7 hari ke hadapan walaupun aplikasi ditutup; penggera tepat di Android
• Pergi ke: cari surah juga melalui maksud
</ms>

<es-ES>
Quran Muallem 1.4
• Nuevo: Recitadores (pestaña Más) – 86 jeques en todas las riwayat (Hafs, Warsh, Qalun, Shu'ba …), búsqueda, favoritos, descarga con progreso
• La reproducción sigue con la siguiente sura; pantalla de bloqueo «Jeque | Sura», versículo anterior/siguiente, imagen y línea de tiempo
• Adhan programado 7 días antes, aunque la app siga cerrada; alarmas exactas en Android
• Ir a: buscar la sura también por su significado
</es-ES>

<ru-RU>
Quran Muallem 1.4
• Новое: Чтецы (вкладка «Ещё») — 86 шейхов во всех ривайатах (Хафс, Варш, Калун, Шуба …), поиск, избранное, загрузка с прогрессом
• Воспроизведение переходит к следующей суре; экран блокировки «Шейх | Сура», аят назад/вперёд, обложка и шкала
• Азан запланирован на 7 дней вперёд, даже если приложение закрыто; точные будильники на Android
• Перейти: поиск суры и по значению названия
</ru-RU>

<bn-BD>
Quran Muallem 1.4
• নতুন: কারীগণ («আরও» ট্যাবে) — সব রিওয়ায়াতে ৮৬ জন শাইখ (হাফস, ওয়ারশ, কালুন, শু'বা…), খোঁজা, প্রিয়, অগ্রগতিসহ ডাউনলোড
• তিলাওয়াত পরের সূরায় চলে যায়; লক স্ক্রিনে «শাইখ | সূরা», আগের/পরের আয়াত, ছবি ও টাইমলাইন
• অ্যাপ বন্ধ থাকলেও আজান ৭ দিন আগে থেকে নির্ধারিত; অ্যান্ড্রয়েডে সঠিক সময়ের অ্যালার্ম
• যান: অর্থ দিয়েও সূরা খুঁজুন
</bn-BD>

<sq>
Quran Muallem 1.4
• E re: Lexuesit (skeda Më shumë) – 86 shejhë në të gjitha rivajetet (Hafs, Uersh, Kalun, Shu'be …), kërkim, të preferuar, shkarkim me ecuri
• Leximi vazhdon me suren tjetër; ekrani i kyçjes «Shejhu | Sureja», ajeti para/pas, figurë dhe vijë kohore
• Ezani planifikohet 7 ditë përpara, edhe me aplikacionin të mbyllur; alarme të sakta në Android
• Shko te: kërko suren edhe sipas kuptimit
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.4
• Novo: Učači (kartica Više) – 86 šejhova u svim rivajetima (Hafs, Verš, Kalun, Šu'ba …), pretraga, omiljeni, preuzimanje s napretkom
• Učenje prelazi na sljedeću suru; zaključani ekran «Šejh | Sura», ajet nazad/naprijed, slika i vremenska traka
• Ezan planiran 7 dana unaprijed, i kad je aplikacija zatvorena; tačni alarmi na Androidu
• Idi na: traži suru i po značenju (npr. „Krava“)
```
