# Quran Muallem 1.14.0 – Release Notes (versionCode 45)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Neu: `HandsFreeHifdhService.ts` / `HandsFreeHifdhView.tsx` (Vordergrunddienst Mikrofon `HandsFreeMicService.java`, MediaSession-Tasten, Audio-Route Bluetooth/Lautsprecher/Auto), Kindermodus (`KidsModeContext`, `KidsTafsirView`, `KidsStarJourney`, Daten `src/data/kidsTafsir*.json`), Typografie (`TypographySettings`, `applyTypography`), Mushaf-Stil „lines“.
- Neue Abhängigkeiten: `@capacitor-community/text-to-speech`, Fontsource-Schriften; KFGQPC-Uthmanic-Hafs-Schrift in `public/fonts`.
- v42/v43 (Salat-Modus, Bewegungssensor) unverändert.
- Hintergrund-Mikrofon, Bluetooth-Routing und Headset-Tasten nur im Browser simuliert – auf dem Handy testen.

```
<en-US>
New in 1.14:
• Hands-free Hifdh: put the phone in your pocket, recite from anywhere – the app recognises the verse, follows along and prompts you with the Sheikh's voice when you stop. Bluetooth headset & media buttons supported.
• Kids Mode: warm colours, kids Mushaf, simple tafsir & stories (Juz ʿAmma, Tabarak, al-Fatiha, al-Kahf, Ayat al-Kursi) with read-aloud, and a star journey.
• Typography: app text size 85–160 %, new Quran & reading fonts, high contrast.
• Mushaf: one verse per line.
</en-US>

<de-DE>
Neu in 1.14:
• Freies Hifdh: Handy in die Tasche, irgendwo rezitieren – die App erkennt die Āya, liest mit und hilft mit der Stimme des Scheichs, wenn du stockst. Bluetooth-Headset & Medientasten.
• Kindermodus: warme Farben, Kinder-Mushaf, einfacher Tafsir & Geschichten (Dschuz ʿAmma, Tabārak, al-Fātiḥa, al-Kahf, Thronvers) mit Vorlesen und Sternen-Reise.
• Schrift: Textgröße 85–160 %, neue Quran- & Leseschriften, hoher Kontrast.
• Mushaf: eine Āya pro Zeile.
</de-DE>

<ar>
جديد في 1.14:
• المراجعة الحرة: ضع الهاتف في جيبك واقرأ من أي موضع – يتعرّف التطبيق على الآية ويتابعك ويذكّرك بصوت الشيخ إن توقفت. يدعم سماعة البلوتوث وأزرارها.
• وضع الأطفال: ألوان دافئة، مصحف للأطفال، تفسير وقصص مبسّطة (جزء عمّ وتبارك والفاتحة والكهف وآية الكرسي) مع الاستماع، ورحلة الحفظ بالنجوم.
• الخطوط: حجم النص 85–160٪، خطوط جديدة للمصحف والقراءة، وتباين عالٍ.
• المصحف: آية في كل سطر.
</ar>

<fr-FR>
Nouveau en 1.14 :
• Hifdh mains libres : téléphone en poche, récitez de n'importe où – l'app reconnaît le verset, suit et vous souffle la suite avec la voix du cheikh. Casque Bluetooth et boutons média.
• Mode enfants : couleurs chaudes, Mushaf enfants, tafsir et histoires simples (Juz 'Amma, Tabarak, al-Fatiha, al-Kahf, Ayat al-Kursi) lus à voix haute, voyage des étoiles.
• Typographie : texte 85–160 %, nouvelles polices, contraste élevé.
• Mushaf : un verset par ligne.
</fr-FR>

<tr-TR>
1.14'te yeni:
• Serbest hıfz: telefon cebinde, istediğin yerden oku – uygulama âyeti tanır, takip eder ve durursan şeyhin sesiyle hatırlatır. Bluetooth kulaklık ve medya tuşları.
• Çocuk modu: sıcak renkler, çocuk Mushafı, sesli okunan basit tefsir ve kıssalar (Amme, Tebâreke, Fâtiha, Kehf, Âyetü'l-Kürsî) ve yıldızlı yolculuk.
• Yazı: metin boyutu %85–160, yeni Kur'an ve okuma yazı tipleri, yüksek kontrast.
• Mushaf: her satırda bir âyet.
</tr-TR>

<ur>
1.14 میں نیا:
• آزاد حفظ: فون جیب میں رکھیں اور کہیں سے بھی پڑھیں – ایپ آیت پہچان کر ساتھ چلتی ہے اور رکنے پر شیخ کی آواز میں یاد دلاتی ہے۔ بلوٹوتھ ہیڈسیٹ اور بٹن۔
• بچوں کا موڈ: گرم رنگ، بچوں کا مصحف، آسان تفسیر اور قصے (جزء عم، تبارک، فاتحہ، کہف، آیت الکرسی) سن کر، اور ستاروں کا سفر۔
• خط: متن کا سائز 85–160٪، نئے قرآنی و مطالعہ خطوط، زیادہ کنٹراسٹ۔
• مصحف: ہر سطر میں ایک آیت۔
</ur>

<id>
Baru di 1.14:
• Hifdh bebas tangan: ponsel di saku, baca dari mana saja – aplikasi mengenali ayat, mengikuti, dan membantu dengan suara syekh saat Anda berhenti. Headset Bluetooth & tombol media.
• Mode anak: warna hangat, Mushaf anak, tafsir & kisah sederhana (Juz 'Amma, Tabarak, Al-Fatihah, Al-Kahf, Ayat Kursi) yang dibacakan, dan perjalanan bintang.
• Tulisan: ukuran teks 85–160%, font Quran & baca baru, kontras tinggi.
• Mushaf: satu ayat per baris.
</id>

<ms>
Baharu dalam 1.14:
• Hafazan bebas tangan: telefon dalam poket, baca dari mana-mana – aplikasi mengenal ayat, mengikuti dan membantu dengan suara syeikh apabila anda berhenti. Set kepala Bluetooth & butang media.
• Mod kanak-kanak: warna mesra, Mushaf kanak-kanak, tafsir & kisah ringkas (Juz 'Amma, Tabarak, al-Fatihah, al-Kahf, Ayat Kursi) dibacakan, dan perjalanan bintang.
• Tulisan: saiz teks 85–160%, fon baharu, kontras tinggi.
• Mushaf: satu ayat sebaris.
</ms>

<es-ES>
Novedades en 1.14:
• Hifdh manos libres: móvil en el bolsillo, recita desde cualquier aleya – la app la reconoce, te sigue y te ayuda con la voz del jeque si te detienes. Auriculares Bluetooth y botones.
• Modo infantil: colores cálidos, Mushaf infantil, tafsir e historias sencillas (Juz 'Amma, Tabarak, al-Fatiha, al-Kahf, Ayat al-Kursi) leídas en voz alta y viaje de estrellas.
• Tipografía: texto 85–160 %, nuevas fuentes, alto contraste.
• Mushaf: una aleya por línea.
</es-ES>

<ru-RU>
Новое в 1.14:
• Свободный хифз: телефон в кармане, читайте с любого места – приложение узнаёт аят, следит и подсказывает голосом шейха, если вы остановились. Bluetooth-гарнитура и кнопки.
• Детский режим: тёплые цвета, детский Мусхаф, простой тафсир и истории (джуз 'Амма, Табарак, аль-Фатиха, аль-Кахф, аят аль-Курси) с озвучкой и звёздный путь.
• Шрифты: размер текста 85–160 %, новые шрифты, высокий контраст.
• Мусхаф: один аят в строке.
</ru-RU>

<bn-BD>
১.১৪-এ নতুন:
• হ্যান্ডস-ফ্রি হিফজ: ফোন পকেটে রেখে যেকোনো জায়গা থেকে পড়ুন – অ্যাপ আয়াত চিনে সাথে চলে, থামলে শাইখের কণ্ঠে মনে করিয়ে দেয়। ব্লুটুথ হেডসেট ও বোতাম।
• শিশু মোড: উষ্ণ রং, শিশুদের মুসহাফ, সহজ তাফসির ও গল্প (জুয আম্মা, তাবারাক, ফাতিহা, কাহফ, আয়াতুল কুরসি) শোনার সুবিধাসহ, আর তারার যাত্রা।
• লেখা: টেক্সট ৮৫–১৬০%, নতুন ফন্ট, উচ্চ কনট্রাস্ট।
• মুসহাফ: প্রতি লাইনে এক আয়াত।
</bn-BD>

<sq>
E re në 1.14:
• Hifdh pa duar: telefoni në xhep, lexo nga kudo – aplikacioni njeh ajetin, të ndjek dhe të kujton me zërin e shejhut kur ndalesh. Kufje Bluetooth dhe butona.
• Modaliteti për fëmijë: ngjyra të ngrohta, Mus'haf për fëmijë, tefsir e tregime të thjeshta (Amme, Tebareke, Fatiha, Kehf, Ajetul-Kursijj) me lexim me zë dhe udhëtim me yje.
• Shkrimi: madhësia 85–160%, shkronja të reja, kontrast i lartë.
• Mus'hafi: një ajet për rresht.
</sq>
```

Bosnisch (Website / Social Media):

```
Novo u 1.14:
• Slobodni hifz: mobitel u džep, uči od bilo kojeg ajeta – aplikacija prepoznaje ajet, prati te i pomaže glasom šejha kad zastaneš. Bluetooth slušalice i dugmad.
• Dječiji način: tople boje, dječiji Mushaf, jednostavan tefsir i priče (džuz 'Amme, Tebareke, Fatiha, Kehf, Ajetul-kursija) s čitanjem naglas i putovanje sa zvjezdicama.
• Pismo: veličina teksta 85–160 %, novi fontovi, visok kontrast.
• Mushaf: jedan ajet po redu.
```
