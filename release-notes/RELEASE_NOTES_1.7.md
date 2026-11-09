# Quran Muallem 1.7 – Release Notes (versionCode 27)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Automatische Vers-Erkennung (`src/lib/ayahLocator.ts`): sucht die Rezitation im ganzen Koran (Phoneme der Zipformer-Erkennung bzw. Text von Whisper), Schwelle 85 % und eindeutig; Basmala allein zählt nicht. Getestet mit echter Erkennung im Browser: Al-Kahf auf Seite 1 begonnen → nach ca. 9 s auf Seite 293 gesprungen, 97 % grün.
- Nur im Mushaf; der Tasmīʿ-Tab mit fester Auswahl bleibt unverändert.

```
<en-US>
Quran Muallem 1.7
• New: the Mushaf recognises what you recite – start the microphone on any page and recite from memory: after a few words the app finds the surah and verse in the whole Quran, jumps there and colours your recitation word by word
• A small badge shows what was recognised, e.g. "Surah Al-Kahf, verse 1"
• Works offline with the on-device recognition
</en-US>

<de-DE>
Quran Muallem 1.7
• Neu: Der Mushaf erkennt, was du rezitierst – Mikrofon auf irgendeiner Seite starten und auswendig rezitieren: nach wenigen Wörtern findet die App Sure und Vers im ganzen Koran, springt dorthin und färbt deine Rezitation Wort für Wort
• Ein kleiner Hinweis zeigt, was erkannt wurde, z. B. „Sure Al-Kahf, Vers 1“
• Funktioniert offline mit der Erkennung auf dem Gerät
</de-DE>

<ar>
معلم القرآن 1.7
• جديد: المصحف يتعرّف على ما تتلوه — شغّل الميكروفون في أي صفحة واقرأ من حفظك: بعد كلمات قليلة يجد التطبيق السورة والآية في القرآن كله، وينتقل إليها ويلوّن تلاوتك كلمة بكلمة
• تنبيه صغير يبيّن ما تم التعرف عليه، مثل «تم التعرف على سورة الكهف - الآية ١»
• يعمل دون إنترنت بالتعرّف على الجهاز
</ar>

<fr-FR>
Quran Muallem 1.7
• Nouveau : le Mushaf reconnaît ce que tu récites – lance le micro sur n’importe quelle page et récite de mémoire : après quelques mots, l’appli trouve la sourate et le verset dans tout le Coran, s’y rend et colore ta récitation mot par mot
• Un petit badge indique ce qui a été reconnu
• Fonctionne hors ligne
</fr-FR>

<tr-TR>
Quran Muallem 1.7
• Yeni: Mushaf okuduğunu tanıyor – herhangi bir sayfada mikrofonu aç ve ezberden oku: birkaç kelimeden sonra uygulama sureyi ve ayeti tüm Kur’an’da bulur, oraya gider ve okumanı kelime kelime renklendirir
• Küçük bir rozet neyin tanındığını gösterir
• Cihaz üzerinde, çevrimdışı çalışır
</tr-TR>

<ur>
قرآن معلم 1.7
• نیا: مصحف آپ کی تلاوت پہچانتا ہے — کسی بھی صفحے پر مائیک شروع کریں اور زبانی پڑھیں: چند الفاظ کے بعد ایپ پورے قرآن میں سورت اور آیت ڈھونڈ کر وہاں چلی جاتی ہے اور تلاوت کو لفظ بہ لفظ رنگ دیتی ہے
• ایک چھوٹا نشان بتاتا ہے کہ کیا پہچانا گیا
• آف لائن، آلے پر کام کرتا ہے
</ur>

<id>
Quran Muallem 1.7
• Baru: mushaf mengenali bacaanmu – nyalakan mikrofon di halaman mana pun dan baca hafalanmu: setelah beberapa kata aplikasi menemukan surah dan ayat di seluruh Al-Qur’an, berpindah ke sana dan mewarnai bacaanmu kata demi kata
• Lencana kecil menunjukkan apa yang dikenali
• Berfungsi offline
</id>

<ms>
Quran Muallem 1.7
• Baharu: mushaf mengenali bacaan anda – hidupkan mikrofon di mana-mana halaman dan baca hafalan: selepas beberapa perkataan aplikasi menemui surah dan ayat dalam seluruh Al-Quran, berpindah ke sana dan mewarnakan bacaan perkataan demi perkataan
• Lencana kecil menunjukkan apa yang dikenali
• Berfungsi tanpa talian
</ms>

<es-ES>
Quran Muallem 1.7
• Nuevo: el Mushaf reconoce lo que recitas – activa el micrófono en cualquier página y recita de memoria: tras unas palabras la app encuentra la sura y el versículo en todo el Corán, salta allí y colorea tu recitación palabra por palabra
• Una pequeña insignia muestra lo reconocido
• Funciona sin conexión
</es-ES>

<ru-RU>
Quran Muallem 1.7
• Новое: мусхаф узнаёт, что вы читаете — включите микрофон на любой странице и читайте наизусть: после нескольких слов приложение находит суру и аят во всём Коране, переходит туда и раскрашивает чтение по словам
• Небольшой значок показывает, что распознано
• Работает офлайн
</ru-RU>

<bn-BD>
Quran Muallem 1.7
• নতুন: মুসহাফ আপনার তিলাওয়াত চেনে — যেকোনো পৃষ্ঠায় মাইক চালু করে মুখস্থ পড়ুন: কয়েকটি শব্দের পর অ্যাপ পুরো কুরআনে সূরা ও আয়াত খুঁজে সেখানে যায় এবং শব্দে শব্দে রং দেয়
• ছোট একটি ব্যাজ দেখায় কী শনাক্ত হলো
• অফলাইনে কাজ করে
</bn-BD>

<sq>
Quran Muallem 1.7
• E re: Mushafi njeh atë që lexon – ndize mikrofonin në çdo faqe dhe lexo përmendsh: pas pak fjalësh aplikacioni gjen suren dhe ajetin në gjithë Kuranin, shkon atje dhe ngjyros leximin fjalë për fjalë
• Një shenjë e vogël tregon çfarë u njoh
• Punon pa internet
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.7
• Novo: mushaf prepoznaje šta učiš – uključi mikrofon na bilo kojoj stranici i uči napamet: nakon nekoliko riječi aplikacija pronađe suru i ajet u cijelom Kur’anu, prebaci se tamo i boji učenje riječ po riječ
• Mala oznaka pokazuje šta je prepoznato
• Radi bez interneta
```
