# Quran Muallem 1.5 – Release Notes (versionCode 25)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Android-Sperrbildschirm / Hintergrund-Audio: eigener Dienst (`native/android/BackgroundAudio*.java`) mit MediaSession, WakeLock und WLAN-Lock. `@capgo/capacitor-media-session` wurde entfernt (hielt keinen WakeLock → Ton brach bei gesperrtem Bildschirm ab). Nach `npm install` einmal `node scripts/native-permissions.mjs` und `npx cap sync`.
- Adhan-Fehler: Android-Kanäle wurden nur einmal pro App-Start und nur für die damals gewählten Stimmen angelegt – Benachrichtigungen auf fehlende Kanäle verwirft Android stillschweigend. Jetzt werden alle Kanäle bei jeder Planung geprüft.
- `USE_EXACT_ALARM` weiterhin bewusst nicht eingetragen (Play-Richtlinie); `SCHEDULE_EXACT_ALARM` wird beim ersten Mal über „Wecker und Erinnerungen“ angefragt.
- Adhan-Aufnahmen aus 1.2: Nutzungsrechte bestätigen; Makkah, al-Aqsa, Abdul Basit fehlen weiter.

```
<en-US>
Quran Muallem 1.5
• Fixed: Adhan now sounds with the app closed, in standby and while open (also after changing the muezzin), with an in-app "Prayer time" banner
• Fixed: recitation keeps playing with the screen locked; lock screen with surah, Sheikh, artwork, progress, previous/next
• Fixed: reciter downloads no longer hang – progress, ✓ and count; automatic retries and backup sources
• New: next prayer with live countdown on the prayer card
</en-US>

<de-DE>
Quran Muallem 1.5
• Behoben: Adhan ertönt bei geschlossener App, im Standby und bei offener App (auch nach Muezzin-Wechsel), mit Hinweis „Gebetszeit“ in der App
• Behoben: Rezitation läuft bei gesperrtem Bildschirm weiter; Sperrbildschirm mit Sure, Scheich, Bild, Fortschritt, zurück/vor
• Behoben: Rezitatoren-Downloads hängen nicht mehr – Fortschritt, ✓ und Zähler; automatische Wiederholung und Ersatzquellen
• Neu: nächstes Gebet mit Live-Countdown auf der Gebetskarte
</de-DE>

<ar>
معلم القرآن 1.5
• إصلاح: الأذان يعمل والتطبيق مغلق أو في وضع السكون أو مفتوح (حتى بعد تغيير المؤذن)، مع تنبيه «حان الآن وقت الصلاة» داخل التطبيق
• إصلاح: التلاوة تستمر والشاشة مقفلة، وشاشة القفل تعرض السورة والشيخ والصورة والتقدم والسابق/التالي
• إصلاح: تنزيل التلاوات لم يعد يتوقف — نسبة التقدم وعلامة ✓ والعدد، مع إعادة المحاولة ومصادر بديلة
• جديد: الصلاة القادمة مع عدّ تنازلي مباشر على بطاقة المواقيت
</ar>

<fr-FR>
Quran Muallem 1.5
• Corrigé : l’adhan sonne appli fermée, en veille et appli ouverte (même après changement de muezzin), avec bandeau « heure de la prière »
• Corrigé : la récitation continue écran verrouillé ; écran verrouillé avec sourate, cheikh, image, progression, précédent/suivant
• Corrigé : les téléchargements ne bloquent plus – progression, ✓ et compteur ; nouvelles tentatives et sources de secours
• Nouveau : prochaine prière avec compte à rebours
</fr-FR>

<tr-TR>
Quran Muallem 1.5
• Düzeltildi: ezan uygulama kapalıyken, bekleme modunda ve açıkken çalıyor (müezzin değişse de), uygulama içi «namaz vakti» uyarısıyla
• Düzeltildi: ekran kilitliyken okuma sürüyor; kilit ekranında sure, şeyh, görsel, ilerleme, önceki/sonraki
• Düzeltildi: kâri indirmeleri artık takılmıyor – ilerleme, ✓ ve sayaç; otomatik tekrar ve yedek kaynaklar
• Yeni: namaz kartında sonraki namaz ve canlı geri sayım
</tr-TR>

<ur>
قرآن معلم 1.5
• درست: اذان ایپ بند، اسٹینڈ بائی اور کھلی حالت میں بجتی ہے (مؤذن بدلنے کے بعد بھی)، ایپ میں «نماز کا وقت» اطلاع کے ساتھ
• درست: اسکرین لاک ہونے پر تلاوت جاری؛ لاک اسکرین پر سورت، شیخ، تصویر، پیش رفت، پچھلی/اگلی
• درست: قراء کے ڈاؤن لوڈ اب نہیں رکتے — پیش رفت، ✓ اور گنتی؛ خودکار دوبارہ کوشش اور متبادل ذرائع
• نیا: نماز کارڈ پر اگلی نماز اور براہ راست الٹی گنتی
</ur>

<id>
Quran Muallem 1.5
• Diperbaiki: azan berbunyi saat aplikasi ditutup, siaga, maupun terbuka (juga setelah ganti muazin), dengan pemberitahuan «waktu salat» di aplikasi
• Diperbaiki: bacaan tetap diputar saat layar terkunci; layar kunci dengan surah, syekh, gambar, progres, sebelumnya/berikutnya
• Diperbaiki: unduhan qari tidak macet lagi – progres, ✓ dan jumlah; coba ulang otomatis dan sumber cadangan
• Baru: salat berikutnya dengan hitung mundur langsung
</id>

<ms>
Quran Muallem 1.5
• Dibaiki: azan berbunyi ketika aplikasi ditutup, dalam mod tunggu sedia dan ketika dibuka (juga selepas tukar muazzin), dengan makluman «waktu solat»
• Dibaiki: bacaan terus dimainkan ketika skrin dikunci; skrin kunci dengan surah, syeikh, gambar, kemajuan, sebelum/seterusnya
• Dibaiki: muat turun qari tidak tersangkut lagi – kemajuan, ✓ dan kiraan; cuba semula automatik dan sumber sandaran
• Baharu: solat seterusnya dengan kira detik langsung
</ms>

<es-ES>
Quran Muallem 1.5
• Corregido: el adhan suena con la app cerrada, en reposo y abierta (también tras cambiar el almuédano), con aviso «hora de la oración»
• Corregido: la recitación sigue con la pantalla bloqueada; pantalla de bloqueo con sura, jeque, imagen, progreso, anterior/siguiente
• Corregido: las descargas ya no se atascan – progreso, ✓ y contador; reintentos y fuentes de reserva
• Nuevo: próxima oración con cuenta atrás en vivo
</es-ES>

<ru-RU>
Quran Muallem 1.5
• Исправлено: азан звучит при закрытом приложении, в режиме сна и в открытом (и после смены муэдзина), с баннером «время намаза»
• Исправлено: чтение продолжается при заблокированном экране; на экране блокировки сура, шейх, обложка, прогресс, назад/вперёд
• Исправлено: загрузки больше не зависают — прогресс, ✓ и счётчик; повторы и резервные источники
• Новое: следующий намаз с живым обратным отсчётом
</ru-RU>

<bn-BD>
Quran Muallem 1.5
• ঠিক করা হয়েছে: অ্যাপ বন্ধ, স্ট্যান্ডবাই বা খোলা — সব অবস্থায় আজান বাজে (মুয়াজ্জিন বদলালেও), অ্যাপে «নামাজের সময়» বার্তাসহ
• ঠিক করা হয়েছে: স্ক্রিন লক থাকলেও তিলাওয়াত চলে; লক স্ক্রিনে সূরা, শাইখ, ছবি, অগ্রগতি, আগের/পরের
• ঠিক করা হয়েছে: ডাউনলোড আর আটকে যায় না — অগ্রগতি, ✓ ও গণনা; স্বয়ংক্রিয় পুনরায় চেষ্টা ও বিকল্প উৎস
• নতুন: পরের নামাজ ও লাইভ কাউন্টডাউন
</bn-BD>

<sq>
Quran Muallem 1.5
• U rregullua: ezani bie me aplikacionin të mbyllur, në gjumë dhe të hapur (edhe pas ndërrimit të myezinit), me njoftim «koha e namazit»
• U rregullua: leximi vazhdon me ekran të kyçur; ekrani i kyçjes me sure, shejh, figurë, ecuri, para/pas
• U rregullua: shkarkimet nuk ngecin më – ecuri, ✓ dhe numërues; riprovim automatik dhe burime rezervë
• E re: namazi i radhës me numërim mbrapsht
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.5
• Popravljeno: ezan se oglašava kad je aplikacija zatvorena, u mirovanju i otvorena (i nakon promjene mujezina), uz obavijest «vrijeme namaza»
• Popravljeno: učenje se nastavlja sa zaključanim ekranom; zaključani ekran sa surom, šejhom, slikom, napretkom, nazad/naprijed
• Popravljeno: preuzimanja više ne zapinju – napredak, ✓ i brojač; automatski ponovni pokušaji i rezervni izvori
• Novo: sljedeći namaz s odbrojavanjem uživo
```
