# Quran Muallem 1.12.0 – Release Notes (versionCode 42)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Neu: `src/components/SalatModeView.tsx` (UI, Prompt-Player, Wake-Lock) + `src/lib/SalatPrayerTracker.ts` (Zustandsautomat RECITING_FATIHA → ACTIVE_SURAH_TRACKING → IN_RUKU_OR_SUJUD); Einstieg: Hub-Karte «وضع الصلاة» und Button im Tasmīʿ-Bildschirm.
- Erkennung on-device (`useRecitation`, `keepAudio: false`), 2. Sura per `ayahLocator`; Takbīr / «سمع الله لمن حمده» / Tasbīḥ per Phonem-Suche; Prompts mit Quran.com-Wortzeiten (`fields=segments`), offline proportional aus der Vers-Datei.
- Stimmen: nur Scheichs mit Wortzeiten (Alafasy, Abdul-Basit, Husary, Minshawi, Sudais, Shuraym, Shatri). Kein Qalun (die Erkennung prüft Hafs).

```
<en-US>
Quran Muallem 1.12.0
• New: Salat Mode – a silent companion in prayer and Qiyam al-Layl. It never interrupts al-Fatihah, then follows the next surah; if you stop because you forgot, the Sheikh gently plays the next 2–3 words (or the whole verse). At «Allahu Akbar» it falls silent until the next rak'ah
• Choose the reminder voice, silence delay, length and volume; pitch-black screen stays on
• Fully on-device
</en-US>

<de-DE>
Quran Muallem 1.12.0
• Neu: Gebetsmodus – ein stiller Begleiter im Gebet und Nachtgebet. Während der Fātiḥa greift er nie ein, danach folgt er der nächsten Sura; bleibst du hängen, spielt der Scheich leise die nächsten 2–3 Wörter (oder die ganze Āya). Bei «Allāhu akbar» schweigt er bis zur nächsten Rakʿa
• Stimme, Pause, Länge und Lautstärke wählbar; schwarzer Bildschirm bleibt an
• Komplett auf dem Gerät
</de-DE>

<ar>
معلم القرآن 1.12.0
• جديد: وضع الصلاة — رفيق صامت في صلاتك وقيام الليل. لا يتدخّل أثناء الفاتحة، ثم يتابع السورة التي بعدها، وإن توقّفت ناسيًا أسمعك القارئ بهدوء الكلمتين أو الثلاث التالية (أو الآية كاملة). وعند «الله أكبر» يسكت حتى الركعة التالية
• اختر صوت القارئ ومدة الصمت وطول التذكير ومستوى الصوت، مع شاشة سوداء تبقى مضاءة
• يعمل بالكامل على جهازك
</ar>

<fr-FR>
Quran Muallem 1.12.0
• Nouveau : mode Prière – un compagnon silencieux pendant la prière et la prière de nuit. Il n'interrompt jamais la Fâtiha, puis suit la sourate suivante ; en cas d'oubli, le cheikh joue doucement les 2–3 mots suivants (ou le verset entier). À «Allâhu akbar», il se tait jusqu'à la rakʿa suivante
• Voix, délai, longueur et volume au choix ; écran noir toujours allumé
• Entièrement sur l'appareil
</fr-FR>

<tr-TR>
Quran Muallem 1.12.0
• Yeni: Namaz Modu – namazda ve gece namazında sessiz bir yol arkadaşı. Fâtiha'ya asla karışmaz, sonra okunan sureyi takip eder; unutup durursan hoca sonraki 2–3 kelimeyi (veya tüm âyeti) yavaşça okur. «Allâhu ekber» dendiğinde bir sonraki rekâta kadar susar
• Ses, bekleme süresi, uzunluk ve ses düzeyi seçilebilir; siyah ekran açık kalır
• Tamamen cihazda çalışır
</tr-TR>

<ur>
قرآن معلم 1.12.0
• نیا: نماز موڈ — نماز اور قیام اللیل میں خاموش ساتھی۔ فاتحہ میں کبھی مداخلت نہیں کرتا، پھر اگلی سورت کے ساتھ چلتا ہے؛ بھول کر رک جائیں تو قاری آہستہ سے اگلے 2–3 الفاظ (یا پوری آیت) سناتا ہے۔ «اللہ اکبر» پر اگلی رکعت تک خاموش ہو جاتا ہے
• آواز، وقفہ، لمبائی اور آواز کی سطح منتخب کریں؛ سیاہ اسکرین روشن رہتی ہے
• مکمل طور پر آپ کے آلے پر
</ur>

<id>
Quran Muallem 1.12.0
• Baru: Mode Salat – pendamping yang diam saat salat dan qiyamul lail. Tidak menyela Al-Fatihah, lalu mengikuti surah berikutnya; jika berhenti karena lupa, syekh memperdengarkan 2–3 kata berikutnya (atau satu ayat) dengan pelan. Saat «Allahu akbar» ia diam sampai rakaat berikutnya
• Pilih suara, jeda, panjang, dan volume; layar hitam tetap menyala
• Sepenuhnya di perangkat
</id>

<ms>
Quran Muallem 1.12.0
• Baharu: Mod Solat – peneman senyap dalam solat dan qiamullail. Tidak mencelah Al-Fatihah, kemudian mengikuti surah seterusnya; jika berhenti kerana lupa, syeikh memperdengarkan 2–3 perkataan seterusnya (atau satu ayat) dengan perlahan. Pada «Allahu akbar» ia diam hingga rakaat seterusnya
• Pilih suara, jeda, panjang dan kelantangan; skrin hitam kekal menyala
• Sepenuhnya pada peranti
</ms>

<es-ES>
Quran Muallem 1.12.0
• Nuevo: modo Oración – un compañero silencioso en la oración y el Qiyam al-Layl. Nunca interrumpe la Fátiha; luego sigue la sura siguiente y, si te detienes por olvido, el jeque recita suavemente las 2–3 palabras siguientes (o la aleya entera). Con «Allahu akbar» calla hasta la siguiente rakʿa
• Elige voz, pausa, longitud y volumen; pantalla negra siempre encendida
• Todo en el dispositivo
</es-ES>

<ru-RU>
Quran Muallem 1.12.0
• Новое: режим намаза — тихий спутник в намазе и ночной молитве. Не вмешивается в «аль-Фатиху», затем следит за следующей сурой; если вы забыли и остановились, чтец тихо подскажет 2–3 следующих слова (или весь аят). На «Аллаху акбар» замолкает до следующего ракаата
• Выбор голоса, паузы, длины и громкости; чёрный экран не гаснет
• Полностью на устройстве
</ru-RU>

<bn-BD>
Quran Muallem 1.12.0
• নতুন: সালাত মোড — নামাজ ও কিয়ামুল লাইলে নীরব সঙ্গী। ফাতিহায় কখনো বাধা দেয় না, তারপর পরের সূরা অনুসরণ করে; ভুলে থেমে গেলে শায়খ আস্তে পরের ২–৩টি শব্দ (বা পুরো আয়াত) শোনান। «আল্লাহু আকবার»-এ পরের রাকাত পর্যন্ত চুপ থাকে
• কণ্ঠ, বিরতি, দৈর্ঘ্য ও ভলিউম বেছে নিন; কালো স্ক্রিন চালু থাকে
• সম্পূর্ণ ডিভাইসে
</bn-BD>

<sq>
Quran Muallem 1.12.0
• E re: Modaliteti i Namazit – shoqërues i heshtur në namaz dhe në namazin e natës. Nuk ndërhyn kurrë në Fatiha, pastaj ndjek suren e radhës; nëse ndalon nga harresa, hoxha të dëgjon qetë 2–3 fjalët e radhës (ose ajetin e plotë). Te «Allahu ekber» hesht deri në rekatin tjetër
• Zgjidh zërin, pauzën, gjatësinë dhe volumin; ekrani i zi mbetet ndezur
• Plotësisht në pajisje
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.12.0
• Novo: Namaski način – tihi pratilac u namazu i noćnom namazu. Nikad ne prekida Fatihu, zatim prati sljedeću suru; ako zastaneš jer si zaboravio, hafiz tiho prouči sljedeće 2–3 riječi (ili cijeli ajet). Na «Allahu ekber» utihne do sljedećeg rekata
• Biraj glas, pauzu, dužinu i jačinu; crni ekran ostaje upaljen
• Potpuno na uređaju
```
