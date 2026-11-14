# Quran Muallem 1.18.0 – Release Notes (versionCode 49)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Hintergrund-Mikrofon: `HandsFreeMicService` nimmt per AudioRecord (16 kHz) auf und streamt „mic“-Events; `recordWav` mit `background: true` nutzt es auf Android (Fallback: WebView-Mikrofon). `MainActivity` hält die WebView sichtbar, solange Hands-free / رفيق الصلاة laufen. Bitte mit ausgeschaltetem Bildschirm testen.
- Prompt-Fix: `LiveMatch.inProgress` + `continuationToken`; Salat-Guard „سبحان الله“ bei Rakʿa > Ziel (Sensor oder Stimme), Audio-Freischaltung beim Start.
- Navigation „المرافق“ mit eigenem Symbol (Mihrab + Halbmond + Sudschūd), doppelte Einstiege entfernt; Kinder: Āyāt verstecken; Erzählstimme, sanfte Naturklänge; Französisch für Kinder-Tafsir und Geschichten.

```
<en-US>
New in 1.18:
• Hands-free Hifdh and Salat Companion keep listening with the screen off (microphone in the background service).
• «Companion» has its own tab with a new icon; duplicate buttons removed.
• Fixed: the prompt now continues after the word you stopped on; «SubhanAllah» reliably sounds on an extra rakʿah.
• Kids: hide verses to recite (cloud cards), warmer storyteller voice, soft ambience.
• French for kids tafsir and all stories.
</en-US>

<de-DE>
Neu in 1.18:
• Freies Hifdh und Gebetsbegleiter hören auch bei ausgeschaltetem Bildschirm weiter (Mikrofon im Hintergrunddienst).
• „Begleiter“ hat einen eigenen Tab mit neuem Symbol; doppelte Knöpfe entfernt.
• Behoben: Die Hilfe setzt nach dem Wort fort, bei dem du angehalten hast; „SubhanAllah“ ertönt sicher bei einer Rakʿa zu viel.
• Kinder: Āyāt verstecken zum Aufsagen (Wolken), wärmere Erzählstimme, sanfte Naturklänge.
• Französisch für Kinder-Tafsir und alle Geschichten.
</de-DE>

<ar>
جديد في 1.18:
• المراجعة الحرة ورفيق الصلاة يستمعان حتى مع إطفاء الشاشة (الميكروفون في خدمة الخلفية).
• «المرافق» في تبويب مستقل بأيقونة جديدة، وحُذفت الأزرار المكرّرة.
• إصلاح: التذكير يبدأ بعد الكلمة التي توقفت عندها، و«سبحان الله» تُسمع دائمًا عند الركعة الزائدة.
• الأطفال: إخفاء الآيات للتسميع (بطاقات السحاب)، وصوت راوٍ أدفأ، وأجواء هادئة.
• الفرنسية لتفسير الأطفال وجميع القصص.
</ar>

<fr-FR>
Nouveau en 1.18 :
• Le Hifdh mains libres et le Compagnon de prière écoutent même écran éteint (micro dans le service d'arrière-plan).
• « Compagnon » a son propre onglet avec une nouvelle icône ; boutons en double supprimés.
• Corrigé : le rappel reprend après le mot où tu t'es arrêté ; « SubhanAllah » retentit toujours en cas de rak'a en trop.
• Enfants : cacher les versets pour réciter, voix de conteur chaleureuse, ambiance douce.
• Français pour le tafsir enfants et toutes les histoires.
</fr-FR>

<tr-TR>
1.18'de yeni:
• Serbest hıfz ve Namaz Arkadaşı ekran kapalıyken de dinler (mikrofon arka plan hizmetinde).
• «Rehber» yeni simgeyle kendi sekmesinde; tekrar eden düğmeler kaldırıldı.
• Düzeltildi: hatırlatma durduğun kelimeden sonra devam eder; fazla rekâtta «Sübhanallah» kesin duyulur.
• Çocuklar: ezber için âyetleri gizle (bulut kartlar), daha sıcak anlatıcı sesi, sakin ortam.
• Çocuk tefsiri ve tüm kıssalar için Fransızca.
</tr-TR>

<ur>
1.18 میں نیا:
• آزاد حفظ اور نماز کا ساتھی اسکرین بند ہونے پر بھی سنتے رہتے ہیں (مائیکروفون پس منظر سروس میں)۔
• «ساتھی» نئے آئیکن کے ساتھ الگ ٹیب میں؛ دہرے بٹن ہٹا دیے گئے۔
• درست: یاد دہانی رکے ہوئے لفظ کے بعد سے شروع ہوتی ہے؛ زائد رکعت پر «سبحان اللہ» ضرور سنائی دیتا ہے۔
• بچے: سنانے کے لیے آیات چھپائیں، گرم راوی آواز، پرسکون ماحول۔
• بچوں کی تفسیر اور تمام قصوں کے لیے فرانسیسی۔
</ur>

<id>
Baru di 1.18:
• Hifdh bebas tangan dan Pendamping Salat tetap mendengar saat layar mati (mikrofon di layanan latar).
• «Pendamping» punya tab sendiri dengan ikon baru; tombol ganda dihapus.
• Diperbaiki: bantuan berlanjut setelah kata tempat Anda berhenti; «SubhanAllah» selalu terdengar saat rakaat berlebih.
• Anak: sembunyikan ayat untuk setoran, suara pencerita lebih hangat, suasana tenang.
• Bahasa Prancis untuk tafsir anak dan semua kisah.
</id>

<ms>
Baharu dalam 1.18:
• Hafazan bebas tangan dan Teman Solat terus mendengar walaupun skrin padam (mikrofon dalam perkhidmatan latar).
• «Teman» ada tab sendiri dengan ikon baharu; butang berganda dibuang.
• Dibaiki: bantuan bersambung selepas perkataan anda berhenti; «SubhanAllah» sentiasa berbunyi untuk rakaat berlebihan.
• Kanak-kanak: sembunyikan ayat untuk tasmik, suara pencerita lebih mesra, suasana tenang.
• Bahasa Perancis untuk tafsir kanak-kanak dan semua kisah.
</ms>

<es-ES>
Novedades en 1.18:
• El Hifdh manos libres y el Compañero de oración siguen escuchando con la pantalla apagada (micrófono en el servicio en segundo plano).
• «Compañero» tiene su propia pestaña con nuevo icono; botones duplicados eliminados.
• Corregido: la ayuda sigue tras la palabra en la que paraste; «SubhanAllah» suena siempre con una rak'a de más.
• Niños: ocultar aleyas para recitar, voz de narrador más cálida, ambiente suave.
• Francés para el tafsir infantil y todas las historias.
</es-ES>

<ru-RU>
Новое в 1.18:
• Свободный хифз и Спутник намаза слушают и при выключенном экране (микрофон в фоновом сервисе).
• «Спутник» — отдельная вкладка с новым значком; дублирующие кнопки убраны.
• Исправлено: подсказка продолжает после слова, на котором вы остановились; «СубханАллах» всегда звучит при лишнем ракаате.
• Дети: скрыть аяты для чтения наизусть, тёплый голос рассказчика, тихая атмосфера.
• Французский для детского тафсира и всех историй.
</ru-RU>

<bn-BD>
১.১৮-এ নতুন:
• হ্যান্ডস-ফ্রি হিফজ ও সালাত সঙ্গী স্ক্রিন বন্ধ থাকলেও শোনে (মাইক্রোফোন ব্যাকগ্রাউন্ড সার্ভিসে)।
• «সঙ্গী» নতুন আইকনসহ আলাদা ট্যাবে; দ্বিগুণ বোতাম সরানো হয়েছে।
• ঠিক করা হয়েছে: যে শব্দে থেমেছ তার পর থেকে সাহায্য; অতিরিক্ত রাকাতে «সুবহানাল্লাহ» অবশ্যই শোনা যায়।
• শিশু: শোনানোর জন্য আয়াত লুকাও, উষ্ণ কথকের কণ্ঠ, শান্ত পরিবেশ।
• শিশু তাফসির ও সব কাহিনির জন্য ফরাসি।
</bn-BD>

<sq>
E re në 1.18:
• Hifdhi pa duar dhe Shoqëruesi i namazit dëgjojnë edhe me ekran të fikur (mikrofoni në shërbimin e sfondit).
• «Shoqëruesi» ka skedën e vet me ikonë të re; butonat e dyfishtë u hoqën.
• Rregulluar: ndihma vazhdon pas fjalës ku ndalove; «SubhanAllah» dëgjohet gjithmonë në një rekat të tepërt.
• Fëmijët: fshih ajetet për t'i lexuar, zë rrëfimtari më i ngrohtë, atmosferë e qetë.
• Frëngjisht për tefsirin e fëmijëve dhe të gjitha tregimet.
</sq>
```

Bosnisch (Website / Social Media):

```
Novo u 1.18:
• Slobodni hifz i Pratilac namaza slušaju i kad je ekran ugašen (mikrofon u pozadinskom servisu).
• «Pratilac» ima svoju karticu s novom ikonom; dupla dugmad uklonjena.
• Ispravljeno: pomoć nastavlja nakon riječi na kojoj si stao; «SubhanAllah» se uvijek čuje kod viška rekata.
• Djeca: sakrij ajete za učenje napamet, topliji glas pripovjedača, mirna atmosfera.
• Francuski za dječiji tefsir i sve priče.
```
