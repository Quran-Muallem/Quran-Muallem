# Quran Muallem 1.23.1 – Release Notes (versionCode 60)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Auto-Erkennung beim Start (`src/lib/recitationStartup.ts`): stille Erkennungsphase (kein Rot, keine Korrektur, Hinweis `identifyingSurah`), Lock-in bei ≥ 5 erkannten Wörtern + ≥ 60 % in der angezeigten Passage; Ausweichregel ≥ 3,5 s + ~9–10 Wörter nur bei ≥ 40 % Passung, sonst bis ~25 Wörter warten; Wörter der Phase werden nie nachträglich korrigiert; späte Umschaltung → neue Phase. `ayahLocator`: Basmala in 27:30 zählt nicht, Treffer kurz vor Versende → nächster Vers, Rückwärts-Verlängerung zum echten Anfang (≥ 60 %). Tasmīʿ: Sprung-Schutz bis zum Stopp (nicht nur 8 s).
- Basmala beim ersten Start: `src/components/FirstLaunchBasmalah.tsx`, Audio `public/audio/basmalah_abdul_basit.mp3` (Abdul Basit Murattal, everyayah 001001). Schlüssel `qm_first_launch_basmalah_done`, gesetzt beim Start der Wiedergabe; Autoplay-Sperre → erste Berührung. Bestehende Installationen (mit `hifz.settings`) hören sie nicht.
- Korrektur-Sperre v2 (`correctionLock.ts`): Ziel ist die ganze Āya + nächste Āya als (nicht bewertete) Vorschau; Wörter vor dem Fehlerwort werden nur verbessert (rot → grün), nie neu als Fehler gewertet; `restartAnchors` (Āya-Anfang, nach letztem Waqf ۖۗۘۙۚۛ, Fehlerwort). Behoben: Sperre löste sich nicht (letztes Wort ohne Folgewörter unbestätigt); Stopp hob die Sperre auf und färbte frühere Āyāt rot.
- Kinder-Sterne: `qm_kids_surah_stars` (Migration aus `qm.kids.reciteStars.v1`), `useSurahStars` = max(Lernfortschritt, Rezitation), 5 Sternplätze in Sterne-Reise, Auswahl und Ergebnis.
- Kinder-Mushaf: Surennamen mit Umschrift + Bedeutung (neu: Albanisch in `surahNamesTranslated.json`), Übersetzung unter jeder Āya (`loadTranslation`, Wahl aus den Einstellungen), runder Mikrofon-Knopf im Ruhezustand.

```
<en-US>
• New: start reciting any surah – the app recognises it, jumps there and only corrects once it is sure (no false interruption)
• First launch opens with the Basmalah by Sheikh Abdul Basit – once only
• After a correction you may restart from the verse start or the last waqf sign – no new interruptions
• Kids: stars saved (5 per surah)
• Kids Mushaf: surah names with meaning and a translation under every verse
• Fixed: correction lock could get stuck; verses turned red when stopping
</en-US>

<de-DE>
• Neu: Beginne irgendeine Sure – die App erkennt sie, springt dorthin und korrigiert erst, wenn sie sicher ist (keine falsche Unterbrechung)
• Der erste Start beginnt mit der Basmala von Sheikh Abdul Basit – nur einmal
• Nach einer Korrektur darfst du am Āya-Anfang oder am letzten Waqf neu ansetzen – ohne neue Unterbrechung
• Kinder: Sterne werden gespeichert (5 pro Sure) und in der Sterne-Reise gezählt
• Behoben: Korrektur-Sperre hing; Āyāt wurden beim Stoppen rot
</de-DE>

<ar>
• جديد: ابدأ أي سورة – يتعرف التطبيق عليها وينتقل إليها ولا يصحح إلا بعد التأكد (لا مقاطعة خاطئة)
• أول تشغيل يبدأ بالبسملة بصوت الشيخ عبد الباسط – مرة واحدة فقط
• بعد التصحيح يمكنك البدء من أول الآية أو من آخر علامة وقف – دون مقاطعة جديدة
• الأطفال: تُحفظ النجوم (٥ لكل سورة) وتُحسب في رحلة النجوم
• مصحف الأطفال: أسماء السور بمعانيها وترجمة تحت كل آية
• إصلاح: قفل التصحيح كان يتوقف، والآيات كانت تحمرّ عند الإيقاف
</ar>

<fr-FR>
• Nouveau : commence n'importe quelle sourate – l'app la reconnaît, s'y rend et ne corrige qu'une fois sûre
• Le premier lancement s'ouvre avec la Basmala du cheikh Abdul Basit – une seule fois
• Après une correction, reprends au début du verset ou au dernier signe de waqf – sans nouvelle interruption
• Enfants : les étoiles sont enregistrées (5 par sourate)
• Mushaf enfants : noms des sourates avec leur sens et traduction sous chaque verset
• Corrigé : verrou bloqué ; versets rouges à l'arrêt
</fr-FR>

<tr-TR>
• Yeni: herhangi bir sureye başla – uygulama onu tanır, oraya geçer ve ancak emin olunca düzeltir
• İlk açılış Şeyh Abdulbasit'in Besmelesiyle başlar – sadece bir kez
• Düzeltmeden sonra ayetin başından veya son vakf işaretinden yeniden başlayabilirsin – yeni kesinti yok
• Çocuklar: yıldızlar kaydedilir (sure başına 5)
• Çocuk Mushaf'ı: anlamlarıyla sure adları ve her ayetin altında meal
• Düzeltildi: kilit takılıyordu; durdurunca ayetler kırmızı oluyordu
</tr-TR>

<ur>
• نیا: کوئی بھی سورت شروع کریں – ایپ اسے پہچان کر وہاں جاتی ہے اور یقین کے بعد ہی تصحیح کرتی ہے
• پہلی بار کھولنے پر شیخ عبدالباسط کی آواز میں بسم اللہ – صرف ایک بار
• تصحیح کے بعد آیت کے شروع یا آخری وقف سے دوبارہ پڑھیں – کوئی نئی رکاوٹ نہیں
• بچے: ستارے محفوظ ہوتے ہیں (ہر سورت کے 5)
• بچوں کا مصحف: سورتوں کے نام معنی کے ساتھ اور ہر آیت کے نیچے ترجمہ
• درست: تصحیح کا لاک اٹک جاتا تھا؛ روکنے پر آیات سرخ ہو جاتی تھیں
</ur>

<id>
• Baru: mulai surah apa pun – aplikasi mengenalinya, berpindah ke sana dan baru mengoreksi setelah yakin
• Peluncuran pertama dibuka dengan Basmalah oleh Syekh Abdul Basit – hanya sekali
• Setelah koreksi kamu boleh mulai dari awal ayat atau tanda waqf terakhir – tanpa interupsi baru
• Anak: bintang tersimpan (5 per surah)
• Mushaf anak: nama surah beserta artinya dan terjemahan di bawah tiap ayat
• Diperbaiki: kunci koreksi macet; ayat menjadi merah saat berhenti
</id>

<ms>
• Baharu: mulakan mana-mana surah – aplikasi mengenalinya, beralih ke sana dan hanya membetulkan selepas pasti
• Pelancaran pertama: Basmalah oleh Syeikh Abdul Basit – sekali sahaja
• Selepas pembetulan anda boleh mula dari awal ayat atau tanda waqaf terakhir – tanpa gangguan baharu
• Kanak-kanak: bintang disimpan (5 setiap surah)
• Mushaf kanak-kanak: nama surah dengan maksud dan terjemahan di bawah setiap ayat
• Dibaiki: kunci pembetulan tersekat; ayat menjadi merah semasa berhenti
</ms>

<es-ES>
• Nuevo: empieza cualquier sura – la app la reconoce, salta a ella y solo corrige cuando está segura
• El primer inicio comienza con la Basmala del jeque Abdul Basit – solo una vez
• Tras una corrección puedes empezar desde el inicio de la aleya o el último signo de waqf – sin nuevas interrupciones
• Niños: las estrellas se guardan (5 por sura)
• Mushaf infantil: nombres de suras con su significado y traducción bajo cada aleya
• Corregido: bloqueo atascado; aleyas en rojo al parar
</es-ES>

<ru-RU>
• Новое: начните любую суру – приложение узнаёт её, переходит к ней и поправляет только когда уверено
• Первый запуск начинается с Басмалы в исполнении шейха Абдул-Басита – только один раз
• После поправки можно начать с начала аята или с последнего знака вакфа – без новых остановок
• Дети: звёзды сохраняются (5 за суру)
• Детский Мусхаф: названия сур со значением и перевод под каждым аятом
• Исправлено: блокировка зависала; аяты краснели при остановке
</ru-RU>

<bn-BD>
• নতুন: যেকোনো সূরা শুরু করো – অ্যাপ চিনে সেখানে যায় এবং নিশ্চিত হলেই সংশোধন করে
• প্রথমবার চালু করলে শাইখ আব্দুল বাসিতের কণ্ঠে বিসমিল্লাহ – শুধু একবার
• সংশোধনের পর আয়াতের শুরু বা শেষ ওয়াকফ চিহ্ন থেকে আবার শুরু করতে পারো – নতুন বাধা নেই
• শিশু: তারা সংরক্ষিত হয় (প্রতি সূরায় ৫টি)
• শিশুদের মুসহাফ: অর্থসহ সূরার নাম ও প্রতিটি আয়াতের নিচে অনুবাদ
• ঠিক করা হয়েছে: লক আটকে যেত; থামালে আয়াত লাল হতো
</bn-BD>

<sq>
• E re: fillo çdo sure – aplikacioni e njeh, kalon atje dhe korrigjon vetëm kur është i sigurt
• Hapja e parë fillon me Besmelen nga shejh Abdul Basiti – vetëm një herë
• Pas korrigjimit mund të rifillosh nga fillimi i ajetit ose nga shenja e fundit e vakfit – pa ndërprerje të reja
• Fëmijët: yjet ruhen (5 për sure)
• Mushafi për fëmijë: emrat e sureve me kuptimin dhe përkthim nën çdo ajet
• U rregullua: kyçja ngecte; ajetet bëheshin të kuqe kur ndalohej
</sq>
```

Bosnisch (Website / Social Media):

```
• Novo: počni bilo koju suru – aplikacija je prepoznaje, prelazi na nju i ispravlja tek kad je sigurna
• Prvo pokretanje počinje Bismillom šejha Abdul-Basita – samo jednom
• Nakon ispravke možeš početi od početka ajeta ili od posljednjeg znaka vakfa – bez novih prekida
• Djeca: zvijezde se čuvaju (5 po suri)
• Dječiji Mushaf: nazivi sura sa značenjem i prijevod ispod svakog ajeta
• Popravljeno: zaključavanje je zapinjalo; ajeti su postajali crveni pri zaustavljanju
```
