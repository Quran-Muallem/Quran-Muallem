# Quran Muallem 1.11.2 – Release Notes (versionCode 40)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Nur Tajwid-Bereich (`tajweedAudio.ts`, `TajweedGuide.tsx`).
- Muallim-Stimmen über die Quran.com-API (QDC) `api.qurancdn.com/api/qdc/audio/reciters/172/audio_files?chapter=N&segments=true`: eine Datei pro Sure (download.quranicaudio.com, Range-Anfragen), Verszeiten + Wortsegmente in absoluten ms; der Vers wird ausgeschnitten (`playClip(url, from, to)`), das Wort mitverfolgt (bei 168 auch die Wiederholungen der Kinder). Ersatz: everyayah `Husary_Muallim_128kbps` / `Minshawy_Teacher_128kbps`.
- Quran.com hat keine weiteren Muallim-Rezitationen (geprüft: v4 `resources/recitations`, QDC `audio/reciters`). Midad (Ali Al-Barraq, Mishary Muallim): nicht eingebaut – signierte, ablaufende Links, nur persönliche Nutzung, keine Verszeiten.

```
<en-US>
Quran Muallem 1.11.2
• Tajweed guide: new «Muallim» (teaching) recitations from Quran.com – Mahmoud Khalil Al-Husary and Muhammad Siddiq Al-Minshawi with children repeating after him
• Each example plays its whole verse with the recited word followed live
</en-US>

<de-DE>
Quran Muallem 1.11.2
• Tajwid-Leitfaden: neue „Muallim“-Lehrrezitationen von Quran.com – Mahmoud Khalil Al-Husary und Muhammad Siddiq Al-Minshawi, bei dem Kinder nachsprechen
• Jedes Beispiel erklingt im ganzen Vers, das rezitierte Wort wird mitverfolgt
</de-DE>

<ar>
معلم القرآن 1.11.2
• دليل التجويد: أُضيف المصحف المعلّم من Quran.com — محمود خليل الحصري، ومحمد صديق المنشاوي مع ترديد الأطفال
• يُسمَع كل مثال في آيته كاملة مع تتبّع الكلمة المقروءة
</ar>

<fr-FR>
Quran Muallem 1.11.2
• Guide du tajwid : nouvelles récitations « Muallim » de Quran.com – Mahmoud Khalil Al-Husary et Muhammad Siddiq Al-Minshawi avec des enfants qui répètent
• Chaque exemple est joué dans son verset entier, mot suivi en direct
</fr-FR>

<tr-TR>
Quran Muallem 1.11.2
• Tecvid rehberi: Quran.com'dan yeni «Muallim» öğretici kıraatler – Mahmud Halil Husarî ve çocukların tekrarladığı Muhammed Sıddık Minşâvî
• Her örnek ayetin tamamıyla, okunan kelime takip edilerek çalınır
</tr-TR>

<ur>
قرآن معلم 1.11.2
• تجوید گائیڈ: Quran.com سے نیا «مصحفِ معلّم» — محمود خلیل حصری، اور محمد صدیق منشاوی بچوں کی تکرار کے ساتھ
• ہر مثال پوری آیت میں، پڑھا جانے والا لفظ ساتھ ساتھ
</ur>

<id>
Quran Muallem 1.11.2
• Panduan tajwid: bacaan «Muallim» (pengajaran) baru dari Quran.com – Mahmoud Khalil Al-Husary dan Muhammad Siddiq Al-Minshawi dengan anak-anak yang mengulang
• Setiap contoh diputar dalam ayat lengkap, kata yang dibaca diikuti
</id>

<ms>
Quran Muallem 1.11.2
• Panduan tajwid: bacaan «Muallim» (pengajaran) baharu dari Quran.com – Mahmoud Khalil Al-Husary dan Muhammad Siddiq Al-Minshawi dengan kanak-kanak mengulang
• Setiap contoh dimainkan dalam ayat penuh, perkataan diikuti
</ms>

<es-ES>
Quran Muallem 1.11.2
• Guía de tajwid: nuevas recitaciones «Muallim» (didácticas) de Quran.com – Mahmoud Khalil Al-Husary y Muhammad Siddiq Al-Minshawi con niños que repiten
• Cada ejemplo suena en su aleya completa, con la palabra seguida en directo
</es-ES>

<ru-RU>
Quran Muallem 1.11.2
• Таджвид: новые учебные чтения «Муаллим» с Quran.com – Махмуд Халиль аль-Хусари и Мухаммад Сиддик аль-Миншави с повторяющими детьми
• Каждый пример звучит целым аятом, слово отслеживается
</ru-RU>

<bn-BD>
Quran Muallem 1.11.2
• তাজবীদ গাইড: Quran.com থেকে নতুন «মুআল্লিম» শিক্ষামূলক তিলাওয়াত – মাহমুদ খলিল আল-হুসারী ও শিশুদের পুনরাবৃত্তিসহ মুহাম্মদ সিদ্দিক আল-মিনশাভী
• প্রতিটি উদাহরণ পুরো আয়াতে, পড়া শব্দ অনুসরণসহ
</bn-BD>

<sq>
Quran Muallem 1.11.2
• Texhvidi: lexime të reja mësimore «Muallim» nga Quran.com – Mahmud Halil El-Husari dhe Muhamed Sidik El-Minshavi me fëmijë që përsërisin
• Çdo shembull luhet në ajetin e plotë, fjala ndiqet
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.11.2
• Tedžvid: nova „Muallim” učenja za podučavanje s Quran.com – Mahmud Halil El-Husari i Muhammed Siddik El-Minšavi uz djecu koja ponavljaju
• Svaki primjer se pušta u cijelom ajetu, riječ se prati
```
