# Quran Muallem 1.11.0 – Release Notes (versionCode 38)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- versionCode 38 (= „v38“ des Nutzers; 37 ausgelassen).
- Live-Färbung: `src/lib/liveMistakes.ts` (`deferLiveMistakes`) – während der Aufnahme bleiben Rot/Orange im aktuellen (und späteren) Vers neutral, bis der Leser zum nächsten Vers weitergeht; nach dem Stopp alles. Gilt für Mushaf (`useRecitation.liveStatuses`) und Tasmīʿ, auch für Fehler-Vibration/-Ton.
- Auswertung nach dem Stopp: `SessionReview` (Mushaf: über Seitenwechsel gesammelt; Tasmīʿ: Passage) mit `diagnoseWord` (tajweedAnalyzer.ts) aus den Phonemen: Madd-Länge, Ghunna, Ikhfa/Iqlab, Qalqala, schwer/leicht, Schadda, Vokale, Buchstaben. Anhören (wie Fehlerkorrektur), „Vers wiederholen“ (startet das Mikrofon an dem Vers), „Details“ (Stimmprofil).
- „Neu starten“: verwirft die laufende Rezitation (nichts gespeichert), Zeit/Punkte auf 0, gespeicherte Farben der Seite/Passage ausgeblendet, bis sie neu rezitiert werden (nicht gelöscht).
- Mushaf-Stil: Madinah (wie bisher) oder fließender Text (Scheherazade New, Schriftgröße 20–44). Indo-Pak/Warsch bewusst nicht (andere Wortgrenzen bzw. Riwaya – Prüfung unmöglich).
- Tajwid-Farben: Quran.com `text_uthmani_tajweed`, pro Sure in IndexedDB; nur Verse mit gleicher Wortzahl wie der Mushaf werden gefärbt (۞ wird mit dem nächsten Wort verbunden).
- Deutsch im Tafsir-Menü: „Der edle Qur'an“ (Bubenheim & Elyas, QuranEnc mit Fußnoten / AlQuran.Cloud), klar als Übersetzung der Bedeutungen markiert; Ibn Kathir (Ilm-Verlag) ist urheberrechtlich geschützt.
- Tajwid-Beispiele: Husary/Minshawi/Abdul-Basit/Mustafa Ismail Mujawwad, Hudhaifi Murattal (kein Mujawwad vorhanden). Wortgenau nur Abdul-Basit/Minshawi (Quran.com-Wortzeiten), sonst ganzer Vers. Tunesische Scheichs: keine freie Quelle; Qalun bewusst nicht (Leitfaden lehrt Hafs).
- Formanten-Analyse der Tafkhim-Stufen: weiterhin nicht möglich (Erkenner liefert Phoneme, keine Formanten).

```
<en-US>
Quran Muallem 1.11.0
• Reciting: words turn red only once the verse is finished – no more premature red
• After stopping: review of every mistake (madd, ghunnah, ikhfa, qalqalah, heavy/light letters…) with listen and «repeat verse»
• «Reset» button in Mushaf and Recite
• Settings: Tajweed colours, flowing Quran text with font size, German «Der edle Qur'an» (meanings)
• Tajweed guide: Mujawwad Sheikhs (Husary, Minshawi, Abdul-Basit, Mustafa Ismail)
</en-US>

<de-DE>
Quran Muallem 1.11.0
• Rezitieren: Wörter werden erst rot, wenn der Vers zu Ende ist – kein vorzeitiges Rot mehr
• Nach dem Stopp: Auswertung aller Fehler (Madd, Ghunna, Ikhfa, Qalqala, schwere/leichte Buchstaben …) mit Anhören und „Vers wiederholen“
• „Neu starten“-Knopf in Mushaf und Rezitieren
• Einstellungen: Tajwid-Farben, fließender Qur'an-Text mit Schriftgröße, „Der edle Qur'an“ (Bedeutungen)
• Tajwid-Leitfaden: Mujawwad-Scheichs (Husary, Minshawi, Abdul-Basit, Mustafa Ismail)
</de-DE>

<ar>
معلم القرآن 1.11.0
• التسميع: لا تحمرّ الكلمات إلا بعد انتهاء الآية — لا تلوين أحمر قبل الأوان
• بعد الإيقاف: مراجعة كل خطأ (المد، الغنة، الإخفاء، القلقلة، التفخيم والترقيق…) مع الاستماع و«أعد الآية»
• زر «إعادة» في المصحف والتسميع
• الإعدادات: ألوان أحكام التجويد، النص القرآني السلس بحجم خط تختاره، «Der edle Qur'an» الألماني (ترجمة المعاني)
• دليل التجويد: قرّاء المصحف المجوّد (الحصري، المنشاوي، عبدالباسط، مصطفى إسماعيل)
</ar>

<fr-FR>
Quran Muallem 1.11.0
• Récitation : les mots ne deviennent rouges qu'à la fin du verset – plus de rouge prématuré
• Après l'arrêt : bilan de chaque erreur (madd, ghunna, ikhfâ’, qalqala, lettres lourdes/légères…) avec écoute et « reprendre le verset »
• Bouton « Recommencer » dans le Mushaf et la récitation
• Réglages : couleurs du tajwid, texte coranique fluide avec taille, « Der edle Qur'an » allemand
• Guide du tajwid : cheikhs Mujawwad
</fr-FR>

<tr-TR>
Quran Muallem 1.11.0
• Okuma: kelimeler ancak ayet bitince kırmızı olur – erken kırmızı yok
• Durdurunca: her hatanın değerlendirmesi (med, gunne, ihfâ, kalkale, kalın/ince harf…) dinleme ve «ayeti tekrarla» ile
• Mushaf'ta ve okumada «Sıfırla» düğmesi
• Ayarlar: tecvid renkleri, yazı boyutlu akıcı Kur'an metni, Almanca «Der edle Qur'an»
• Tecvid rehberi: Mücevved kariler (Husarî, Minşâvî, Abdülbasıt, Mustafa İsmail)
</tr-TR>

<ur>
قرآن معلم 1.11.0
• تلاوت: الفاظ آیت مکمل ہونے کے بعد ہی سرخ ہوتے ہیں — قبل از وقت سرخ نہیں
• روکنے کے بعد: ہر غلطی کا جائزہ (مد، غنہ، اخفاء، قلقلہ، پُر/باریک حروف…) سننے اور «آیت دوبارہ» کے ساتھ
• مصحف اور تلاوت میں «دوبارہ شروع» بٹن
• ترتیبات: تجوید کے رنگ، خط کے سائز کے ساتھ رواں قرآنی متن، جرمن «Der edle Qur'an»
• تجوید گائیڈ: مجوّد قراء (حصری، منشاوی، عبدالباسط، مصطفیٰ اسماعیل)
</ur>

<id>
Quran Muallem 1.11.0
• Membaca: kata baru merah setelah ayat selesai – tidak ada merah terlalu dini
• Setelah berhenti: tinjauan setiap kesalahan (mad, ghunnah, ikhfa, qalqalah, huruf tebal/tipis…) dengan dengarkan dan «ulangi ayat»
• Tombol «Ulangi» di mushaf dan bacaan
• Pengaturan: warna tajwid, teks Al-Qur'an mengalir dengan ukuran huruf, «Der edle Qur'an» (Jerman)
• Panduan tajwid: qari Mujawwad (Husary, Minshawi, Abdul-Basit, Mustafa Ismail)
</id>

<ms>
Quran Muallem 1.11.0
• Bacaan: perkataan hanya merah selepas ayat selesai – tiada merah terlalu awal
• Selepas berhenti: semakan setiap kesilapan (mad, dengung, ikhfa, qalqalah, huruf tebal/nipis…) dengan dengar dan «ulang ayat»
• Butang «Ulang semula» dalam mushaf dan bacaan
• Tetapan: warna tajwid, teks al-Quran mengalir dengan saiz huruf, «Der edle Qur'an» (Jerman)
• Panduan tajwid: qari Mujawwad (Husary, Minshawi, Abdul-Basit, Mustafa Ismail)
</ms>

<es-ES>
Quran Muallem 1.11.0
• Recitación: las palabras solo se ponen rojas al terminar la aleya, sin rojo prematuro
• Tras parar: revisión de cada error (madd, ghunna, ijfá, qalqala, letras enfáticas/ligeras…) con escucha y «repetir aleya»
• Botón «Reiniciar» en el Mushaf y la recitación
• Ajustes: colores del tajwid, texto coránico fluido con tamaño de letra, «Der edle Qur'an» (alemán)
• Guía de tajwid: jeques Muyawwad
</es-ES>

<ru-RU>
Quran Muallem 1.11.0
• Чтение: слова краснеют только после окончания аята – без преждевременного красного
• После остановки: разбор каждой ошибки (мадд, гунна, ихфа, калькаля, твёрдые/мягкие буквы…) с прослушиванием и «повторить аят»
• Кнопка «Сначала» в Мусхафе и чтении
• Настройки: цвета таджвида, сплошной текст с размером шрифта, немецкий «Der edle Qur'an»
• Таджвид: чтецы муджаввад (Хусари, Миншави, Абдульбасит, Мустафа Исмаил)
</ru-RU>

<bn-BD>
Quran Muallem 1.11.0
• তিলাওয়াত: আয়াত শেষ হলেই শব্দ লাল হয় — আগেভাগে লাল নয়
• থামার পর: প্রতিটি ভুলের পর্যালোচনা (মাদ্দ, গুন্নাহ, ইখফা, কলকলা, মোটা/পাতলা হরফ…) শোনা ও «আয়াত আবার» সহ
• মুসহাফ ও তিলাওয়াতে «আবার শুরু» বোতাম
• সেটিংস: তাজবীদের রং, লেখার আকারসহ প্রবাহমান পাঠ, জার্মান «Der edle Qur'an»
• তাজবীদ গাইড: মুজাওয়াদ কারী (হুসারী, মিনশাভী, আব্দুল বাসিত, মুস্তফা ইসমাইল)
</bn-BD>

<sq>
Quran Muallem 1.11.0
• Leximi: fjalët skuqen vetëm pasi mbaron ajeti – pa të kuqe të parakohshme
• Pas ndalimit: rishikim i çdo gabimi (medd, gunne, ihfa, kalkale, shkronja të trasha/të holla…) me dëgjim dhe «përsërit ajetin»
• Butoni «Rifillo» në Mus’haf dhe në lexim
• Cilësimet: ngjyrat e texhvidit, tekst kuranor i rrjedhshëm me madhësi shkrimi, «Der edle Qur'an» gjermanisht
• Texhvidi: lexues Muxhevved
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.11.0
• Učenje: riječi postaju crvene tek kad se ajet završi – nema preranog crvenog
• Nakon zaustavljanja: pregled svake greške (medd, gunna, ihfa, kalkala, debela/tanka slova…) uz slušanje i „ponovi ajet”
• Dugme „Ispočetka” u Mushafu i učenju
• Postavke: boje tedžvida, tekući kur’anski tekst s veličinom slova, njemački „Der edle Qur'an”
• Tedžvid: mudževed učači (Husari, Minšavi, Abdulbasit, Mustafa Ismail)
```
