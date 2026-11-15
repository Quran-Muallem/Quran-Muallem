# Quran Muallem 1.22.0 – Release Notes (versionCode 58)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Neu `src/lib/correctionLock.ts` (Āya-Korrektur-Sperre): nach einer Sofortkorrektur wird ab dem Fehlerwort nur der Rest der Āya geprüft (`startLock` / `lockSegment` / `combineLock`); Freigabe erst, wenn das letzte Wort grün/orange ist (`lockComplete`), danach dieselbe Aufnahme gegen die folgenden Āyāt. Eingebaut in `useRecitation.correctAt` (Mushaf) und im Rezitieren-Tab. Mikrofon pausiert während des Sheikh-Worts (`wordAudioDone`), danach automatische Fortsetzung und 1,8 s Schonzeit; Hinweis «🔒» (`data-correction-lock`).
- Mushaf scrollt mit, wenn das aktuelle Wort den Lesebereich verlässt (Seite und «Āya pro Zeile»).
- Kinder-Mushaf: ganze Sure (bis 60 Āyāt), Mitscrollen, Auto-Stopp am Surenende, Sterne-Karte 1–5 (`kidsRecitationStars.ts`, bestes Ergebnis pro Sure, `qm.kids.reciteStars.v1`), Gesamtzähler = Sterne-Reise + Rezitationssterne.
- Kinder-Start: Sterne-Reise an Position 1. Begleiter: Erinnerungslänge in 13 Sprachen (`promptWords`, `promptAyah`).

```
<en-US>
• Correction lock: after the Sheikh corrects a word, you repeat it and finish the verse – nothing jumps ahead or turns red early
• The Mushaf scrolls along while you recite, also in «one verse per line»
• Kids Mushaf: auto-scroll, stops at the end of the surah, 1–5 stars added to the Star Journey
• Star Journey is the first card on the kids home screen
• Companion reminder buttons in your language
</en-US>

<de-DE>
• Korrektur-Sperre: Nach der Korrektur durch den Sheikh wiederholst du das Wort und beendest die Āya – nichts springt weiter oder wird vorzeitig rot
• Der Mushaf scrollt beim Rezitieren mit, auch bei «eine Āya pro Zeile»
• Kinder-Mushaf: scrollt mit, stoppt am Surenende, 1–5 Sterne für die Sterne-Reise
• Sterne-Reise ist die erste Karte auf der Kinder-Startseite
• Begleiter-Knöpfe in deiner Sprache
</de-DE>

<ar>
• قفل التصحيح: بعد تصحيح الشيخ تعيد الكلمة وتكمل الآية – لا قفز إلى الآية التالية ولا أخطاء حمراء قبل الأوان
• المصحف يتابع التلاوة تلقائيًا، وكذلك في «آية في كل سطر»
• مصحف الأطفال: تمرير تلقائي، توقف عند نهاية السورة، ومن ١ إلى ٥ نجوم في رحلة النجوم
• رحلة النجوم أول بطاقة في صفحة الأطفال
• أزرار طول التذكير في المرافق بلغتك
</ar>

<fr-FR>
• Verrou de correction : après la correction du cheikh, tu répètes le mot et termines le verset – rien ne saute ni ne passe au rouge trop tôt
• Le Mushaf défile pendant la récitation, aussi en «un verset par ligne»
• Mushaf enfants : défilement, arrêt en fin de sourate, 1 à 5 étoiles
• Le voyage des étoiles est la première carte de l'accueil enfants
• Boutons du compagnon dans ta langue
</fr-FR>

<tr-TR>
• Düzeltme kilidi: hoca düzelttikten sonra kelimeyi tekrarlayıp ayeti bitirirsin – erken atlama veya kırmızı yok
• Mushaf okurken kayar, «her satırda bir ayet» modunda da
• Çocuk Mushaf'ı: otomatik kaydırma, sure sonunda durur, 1–5 yıldız
• Yıldız yolculuğu çocuk ana sayfasında ilk kart
• Yoldaş düğmeleri senin dilinde
</tr-TR>

<ur>
• تصحیح کا لاک: شیخ کی تصحیح کے بعد لفظ دہرا کر آیت مکمل کریں – نہ آگے چھلانگ، نہ وقت سے پہلے سرخ
• تلاوت کے ساتھ مصحف خود اسکرول ہوتا ہے، «ہر سطر میں ایک آیت» میں بھی
• بچوں کا مصحف: خودکار اسکرول، سورت کے آخر پر رکنا، 1–5 ستارے
• ستاروں کا سفر بچوں کے ہوم پر پہلا کارڈ
• ساتھی کے بٹن آپ کی زبان میں
</ur>

<id>
• Kunci koreksi: setelah syekh mengoreksi, ulangi kata itu dan selesaikan ayat – tidak melompat atau merah terlalu dini
• Mushaf ikut bergulir saat membaca, juga di «satu ayat per baris»
• Mushaf anak: gulir otomatis, berhenti di akhir surah, 1–5 bintang
• Perjalanan Bintang jadi kartu pertama di beranda anak
• Tombol pendamping dalam bahasamu
</id>

<ms>
• Kunci pembetulan: selepas syeikh membetulkan, ulang perkataan itu dan habiskan ayat – tiada lompatan atau merah terlalu awal
• Mushaf menatal semasa membaca, juga dalam «satu ayat sebaris»
• Mushaf kanak-kanak: tatal automatik, berhenti di akhir surah, 1–5 bintang
• Perjalanan Bintang ialah kad pertama di utama kanak-kanak
• Butang peneman dalam bahasa anda
</ms>

<es-ES>
• Bloqueo de corrección: tras la corrección del jeque repites la palabra y terminas la aleya – nada salta ni se pone rojo antes de tiempo
• El Mushaf se desplaza mientras recitas, también en «una aleya por línea»
• Mushaf infantil: desplazamiento, parada al final de la sura, 1–5 estrellas
• El viaje de estrellas es la primera tarjeta del inicio infantil
• Botones del compañero en tu idioma
</es-ES>

<ru-RU>
• Блокировка поправки: после поправки шейха повтори слово и дочитай аят – без прыжков и преждевременного красного
• Мусхаф прокручивается при чтении, также в режиме «аят на строку»
• Детский Мусхаф: автопрокрутка, остановка в конце суры, 1–5 звёзд
• Путешествие звёзд — первая карточка на детском экране
• Кнопки спутника на твоём языке
</ru-RU>

<bn-BD>
• সংশোধন লক: শাইখের সংশোধনের পর শব্দটি আবার বলে আয়াত শেষ করো – আগে লাফ বা লাল নয়
• তিলাওয়াতের সময় মুসহাফ নিজে স্ক্রল করে, «প্রতি লাইনে এক আয়াত»-এও
• শিশুদের মুসহাফ: স্বয়ংক্রিয় স্ক্রল, সূরার শেষে থামে, ১–৫ তারা
• তারার যাত্রা শিশুদের হোমে প্রথম কার্ড
• সঙ্গীর বোতাম তোমার ভাষায়
</bn-BD>

<sq>
• Kyçja e korrigjimit: pas korrigjimit të hoxhës përsërit fjalën dhe përfundo ajetin – pa kërcime apo të kuqe para kohe
• Mushafi lëviz gjatë recitimit, edhe në «një ajet për rresht»
• Mushafi për fëmijë: lëvizje automatike, ndalon në fund të sures, 1–5 yje
• Udhëtimi i Yjeve është karta e parë për fëmijët
• Butonat e shoqëruesit në gjuhën tënde
</sq>
```

Bosnisch (Website / Social Media):

```
• Zaključavanje ispravke: nakon ispravke šejha ponovi riječ i završi ajet – bez preskakanja ili preranog crvenog
• Mushaf se pomjera dok učiš, i u «jedan ajet po redu»
• Dječiji Mushaf: automatsko pomjeranje, stane na kraju sure, 1–5 zvijezda
• Putovanje zvijezda je prva kartica na dječijoj početnoj
• Dugmad pratioca na tvom jeziku
```
