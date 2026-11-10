# Quran Muallem 1.11.1 – Release Notes (versionCode 39)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Nur Tajwid-Bereich: `TajweedGuide.tsx`, `tajweedAudio.ts`, `tajweedData.ts`, neu `src/data/tajweedVoiceRefs.json`.
- Beispiele spielen immer den ganzen Vers (`playExample`): Stimmen mit Quran.com-Wortzeiten (Abdul-Basit 1, Minshawi 8, Al-Afasy 7) melden das gerade rezitierte Wort (`onWord`), sonst everyayah-/mp3quran-Versdatei; letzter Ersatz: Vers des Scheichs aus den Einstellungen. Keine Wort-für-Wort-Stimme mehr im Leitfaden (gespeicherte Wahl → Husary, «sheikh» → Al-Afasy).
- `tajweedVoiceRefs.json`: pro Stimme und Regel ein Vers, in dem der Scheich laut Quran.com-Wortzeiten 1,2–4 s am Haltezeichen (bzw. ohne Zeichen = Atempause) innehält (nur vollständige, saubere Zeitdaten). Wiederholungen («الابتداء الحسن») lassen sich aus diesen Daten nicht belegen – deshalb nicht behauptet.
- Tunesische Scheichs (Ali Barrak, Younes Gharbi, Anouar Bin Salama): weiterhin keine freie Quelle (mp3quran hat nur Mohammed Al-Barrak, Mustapha Gharbi in Warsch, Yasser Salamah).
- Analyzer unverändert: Waqf-Formen werden an jeder Wortstelle akzeptiert, schwer↔leicht bleibt ein Fehler.

```
<en-US>
Quran Muallem 1.11.1
• Tajweed guide: every example plays its whole verse in the chosen Sheikh's voice; the example word lights up, and with Abdul-Basit, Minshawi and Al-Afasy the recited word is followed live
• Mishary Al-Afasy added; the word-by-word voice stays only in the Mushaf corrections
• Stopping examples at verse ends (1:2, 2:5 …) and, for Abdul-Basit and Minshawi, places where the Sheikh himself pauses
</en-US>

<de-DE>
Quran Muallem 1.11.1
• Tajwid-Leitfaden: Jedes Beispiel erklingt im ganzen Vers in der Stimme des gewählten Scheichs; das Beispielwort leuchtet, bei Abdul-Basit, Minshawi und Al-Afasy wird das gerade rezitierte Wort mitverfolgt
• Neu: Mishary Al-Afasy; die Wort-für-Wort-Stimme bleibt nur bei den Mushaf-Korrekturen
• Waqf-Beispiele am Versende (1:2, 2:5 …) und für Abdul-Basit und Minshawi Stellen, an denen der Scheich selbst innehält
</de-DE>

<ar>
معلم القرآن 1.11.1
• دليل التجويد: يُسمَع كل مثال في آيته كاملة بصوت الشيخ المختار، وتضيء كلمة المثال، ومع عبدالباسط والمنشاوي والعفاسي تُتابَع الكلمة المقروءة لحظة بلحظة
• أُضيف مشاري العفاسي؛ وصوت «كلمة بكلمة» يبقى في تصحيح أخطاء المصحف فقط
• أمثلة الوقف بالسكون من أواخر الآيات (الفاتحة ٢، البقرة ٥…)، ومع عبدالباسط والمنشاوي مواضع يقف فيها الشيخ نفسه
</ar>

<fr-FR>
Quran Muallem 1.11.1
• Guide du tajwid : chaque exemple est joué dans son verset entier avec la voix du cheikh choisi ; le mot s'illumine, et avec Abdul-Basit, Minshawi et Al-Afasy le mot récité est suivi en direct
• Ajout de Mishary Al-Afasy ; la voix mot à mot reste dans les corrections du Mushaf
• Exemples d'arrêt en fin de verset (1:2, 2:5…) et, pour Abdul-Basit et Minshawi, les endroits où le cheikh s'arrête
</fr-FR>

<tr-TR>
Quran Muallem 1.11.1
• Tecvid rehberi: her örnek seçili şeyhin sesiyle ayetin tamamında çalınır; örnek kelime vurgulanır, Abdülbasıt, Minşâvî ve Afâsî'de okunan kelime anlık takip edilir
• Mişari Afâsî eklendi; kelime kelime ses yalnızca Mushaf düzeltmelerinde
• Ayet sonlarından vakıf örnekleri (1:2, 2:5…) ve Abdülbasıt ile Minşâvî'nin bizzat durduğu yerler
</tr-TR>

<ur>
قرآن معلم 1.11.1
• تجوید گائیڈ: ہر مثال منتخب شیخ کی آواز میں پوری آیت کے ساتھ سنائی جاتی ہے؛ مثال کا لفظ نمایاں، اور عبدالباسط، منشاوی اور عفاسی کے ساتھ پڑھا جانے والا لفظ ساتھ ساتھ
• مشاری عفاسی شامل؛ لفظ بہ لفظ آواز صرف مصحف کی اصلاح میں
• آیات کے آخر سے وقف کی مثالیں (۱:۲، ۲:۵…) اور عبدالباسط و منشاوی کے اپنے وقف کے مقامات
</ur>

<id>
Quran Muallem 1.11.1
• Panduan tajwid: setiap contoh diputar dalam ayat lengkap dengan suara syekh pilihan; kata contoh disorot, dan pada Abdul-Basit, Minshawi, Al-Afasy kata yang dibaca diikuti langsung
• Mishary Al-Afasy ditambahkan; suara per kata hanya di koreksi mushaf
• Contoh waqaf di akhir ayat (1:2, 2:5…) dan, untuk Abdul-Basit dan Minshawi, tempat syekh sendiri berhenti
</id>

<ms>
Quran Muallem 1.11.1
• Panduan tajwid: setiap contoh dimainkan dalam ayat penuh dengan suara syeikh pilihan; perkataan contoh diserlahkan, dan bagi Abdul-Basit, Minshawi, Al-Afasy perkataan yang dibaca diikuti secara langsung
• Mishary Al-Afasy ditambah; suara perkataan demi perkataan hanya dalam pembetulan mushaf
• Contoh waqaf di hujung ayat (1:2, 2:5…) dan tempat syeikh sendiri berhenti
</ms>

<es-ES>
Quran Muallem 1.11.1
• Guía de tajwid: cada ejemplo suena en su aleya completa con la voz del jeque elegido; la palabra se ilumina y con Abdul-Basit, Minshawi y Al-Afasy se sigue la palabra recitada en directo
• Añadido Mishary Al-Afasy; la voz palabra por palabra queda solo en las correcciones del Mushaf
• Ejemplos de pausa al final de aleya (1:2, 2:5…) y lugares donde el jeque mismo se detiene
</es-ES>

<ru-RU>
Quran Muallem 1.11.1
• Таджвид: каждый пример звучит целым аятом голосом выбранного шейха; слово примера подсвечено, у Абдульбасита, Миншави и Афаси читаемое слово отслеживается вживую
• Добавлен Мишари Афаси; пословный голос остаётся только в исправлениях Мусхафа
• Примеры остановки в конце аята (1:2, 2:5…) и места, где сам шейх делает паузу
</ru-RU>

<bn-BD>
Quran Muallem 1.11.1
• তাজবীদ গাইড: প্রতিটি উদাহরণ বাছাই করা শাইখের কণ্ঠে পুরো আয়াতে বাজে; উদাহরণের শব্দ উজ্জ্বল, আব্দুল বাসিত, মিনশাভী ও আফাসীর সাথে পড়া শব্দ সরাসরি অনুসরণ
• মিশারি আফাসী যুক্ত; শব্দে শব্দে কণ্ঠ শুধু মুসহাফের সংশোধনে
• আয়াতের শেষে ওয়াকফের উদাহরণ (১:২, ২:৫…) ও শাইখের নিজের থামার স্থান
</bn-BD>

<sq>
Quran Muallem 1.11.1
• Texhvidi: çdo shembull luhet në ajetin e plotë me zërin e shejhut të zgjedhur; fjala ndriçohet, dhe me Abdul-Basit, Minshawi e Al-Afasy fjala e lexuar ndiqet drejtpërdrejt
• U shtua Mishary Al-Afasy; zëri fjalë për fjalë mbetet vetëm te korrigjimet e Mus’hafit
• Shembuj ndalimi në fund të ajetit (1:2, 2:5…) dhe vende ku ndalon vetë shejhu
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.11.1
• Tedžvid: svaki primjer se pušta u cijelom ajetu glasom odabranog šejha; riječ primjera svijetli, a kod Abdulbasita, Minšavija i Afasija riječ koja se uči prati se uživo
• Dodan Mishary Al-Afasy; glas riječ po riječ ostaje samo kod ispravki u Mushafu
• Primjeri vakfa na kraju ajeta (1:2, 2:5…) i mjesta gdje sam šejh zastaje
```
