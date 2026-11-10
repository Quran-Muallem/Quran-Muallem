# Quran Muallem 1.10.0 – Release Notes (versionCode 35)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- 1.10.0 betrifft nur den Tajwid-Bereich: `src/components/TajweedGuide.tsx`, `src/data/tajweedData.ts` (+ `tajweedRefs.json`, `scripts/build-tajweed-refs.py`), neu `src/lib/tajweedAnalyzer.ts` und `src/lib/tajweedAudio.ts`. Minimale Haken außerhalb: `quranAlignment.ts` ruft `judgeWithTajweed` statt `judgeWord`; `audioPlayback.ts` exportiert `playClip`, `normalizeSegments`, `currentWordAudio`.
- Beispiel-Audio: Quran.com-Wortzeiten des gewählten Scheichs (`?fields=segments` – ohne diesen Parameter liefert die API keine Zeiten) → Wort-für-Wort-Dateien → ganzer Vers.
- Analyzer: Waqf-Formen (Sukun, Tanwin-Fath → Alif, Ta marbuta → Ha, Silah weg), Ibtida mit Hamzat al-Wasl, Wiederholung 1–3 Wörter nach Atempause. Grenzen: Formanten/Tafkhim-Stufen, Ra/Lam-Schwere und die Pausenposition an Haltezeichen kann der Phonem-Erkenner nicht messen – im Leitfaden erklärt.

```
<en-US>
Quran Muallem 1.10.0
• Tajweed guide: tap any example to hear it in your chosen Sheikh's voice (word-by-word or whole verse as fallback)
• New sections: stopping with sukūn & starting again, Mushaf stop marks & meaning, heavy & light letters (خ ص ض غ ط ق ظ, five levels), rāʾ, lām & alif
• ⭐ Favourite rules
• Recitation check: stopping on sukūn, a breath stop and repeating the last words are no longer counted as mistakes
</en-US>

<de-DE>
Quran Muallem 1.10.0
• Tajwid-Leitfaden: jedes Beispiel antippen und in der Stimme des gewählten Scheichs hören (Wort für Wort oder ganzer Vers als Ersatz)
• Neu: Anhalten mit Sukun & Neubeginn, Haltezeichen im Mushaf, schwere & leichte Buchstaben (خ ص ض غ ط ق ظ, fünf Stufen), Ra, Lam & Alif
• ⭐ Lieblingsregeln
• Rezitationsprüfung: Anhalten mit Sukun, Atempause und Wiederholen der letzten Wörter gelten nicht mehr als Fehler
</de-DE>

<ar>
معلم القرآن 1.10.0
• دليل التجويد: اضغط أي مثال لتسمعه بصوت الشيخ الذي اخترته (كلمة بكلمة أو الآية كاملة بديلًا)
• أقسام جديدة: الوقف بالسكون والابتداء، أحكام الوقف والابتداء والمعاني، الحروف المفخمة والمرققة (خ ص ض غ ط ق ظ ومراتبها الخمس)، أحكام الراء واللام والألف
• ⭐ القواعد المفضلة
• التسميع: الوقف بالسكون والوقف لضيق النفس وإعادة الكلمات السابقة لا تُعدّ أخطاء
</ar>

<fr-FR>
Quran Muallem 1.10.0
• Guide de tajwid : touchez un exemple pour l'entendre avec la voix du cheikh choisi (mot à mot ou verset entier en secours)
• Nouveau : arrêt avec soukoun et reprise, signes d'arrêt du Mushaf et sens, lettres lourdes et légères (خ ص ض غ ط ق ظ, cinq degrés), rā', lām et alif
• ⭐ Règles favorites
• Récitation : l'arrêt avec soukoun, la pause pour respirer et la répétition des derniers mots ne sont plus des fautes
</fr-FR>

<tr-TR>
Quran Muallem 1.10.0
• Tecvid rehberi: bir örneğe dokunun, seçtiğiniz şeyhin sesiyle dinleyin (yedek olarak kelime kelime veya ayetin tamamı)
• Yeni: sükunla vakıf ve ibtida, Mushaf vakıf işaretleri ve anlam, kalın ve ince harfler (خ ص ض غ ط ق ظ, beş mertebe), ra, lam ve elif
• ⭐ Favori kurallar
• Okuma kontrolü: sükunla durmak, nefes molası ve son kelimeleri tekrar etmek artık hata sayılmaz
</tr-TR>

<ur>
قرآن معلم 1.10.0
• تجوید گائیڈ: کسی مثال کو دبائیں اور منتخب شیخ کی آواز میں سنیں (متبادل: لفظ بہ لفظ یا پوری آیت)
• نئے حصے: سکون کے ساتھ وقف اور ابتدا، مصحف کی وقف علامات اور معنی، پُر اور باریک حروف (خ ص ض غ ط ق ظ، پانچ درجے)، را، لام اور الف
• ⭐ پسندیدہ قواعد
• تلاوت کی جانچ: سکون پر وقف، سانس کا وقف اور پچھلے الفاظ دہرانا اب غلطی نہیں
</ur>

<id>
Quran Muallem 1.10.0
• Panduan tajwid: ketuk contoh untuk mendengarnya dengan suara syekh pilihan Anda (cadangan: per kata atau ayat lengkap)
• Baru: waqaf dengan sukun & ibtida', tanda waqaf Mushaf & makna, huruf tebal & tipis (خ ص ض غ ط ق ظ, lima tingkat), ra, lam & alif
• ⭐ Aturan favorit
• Cek bacaan: waqaf dengan sukun, berhenti karena napas dan mengulang kata terakhir tidak lagi dihitung salah
</id>

<ms>
Quran Muallem 1.10.0
• Panduan tajwid: ketik contoh untuk mendengarnya dengan suara syeikh pilihan anda (sandaran: perkataan demi perkataan atau ayat penuh)
• Baharu: waqaf dengan sukun & ibtida', tanda waqaf Mushaf & makna, huruf tebal & nipis (خ ص ض غ ط ق ظ, lima tingkat), ra, lam & alif
• ⭐ Hukum kegemaran
• Semakan bacaan: waqaf dengan sukun, berhenti kerana nafas dan mengulang perkataan akhir tidak lagi dikira salah
</ms>

<es-ES>
Quran Muallem 1.10.0
• Guía de tajwid: toca un ejemplo para oírlo con la voz del jeque elegido (palabra por palabra o aleya completa como respaldo)
• Nuevo: pausa con sukūn y reanudación, signos de pausa del Mushaf y sentido, letras pesadas y ligeras (خ ص ض غ ط ق ظ, cinco grados), rā', lām y alif
• ⭐ Reglas favoritas
• Recitación: parar con sukūn, la pausa para respirar y repetir las últimas palabras ya no son errores
</es-ES>

<ru-RU>
Quran Muallem 1.10.0
• Таджвид: нажмите на пример — он звучит голосом выбранного шейха (запасной вариант: пословно или весь аят)
• Новое: остановка на сукуне и возобновление, знаки остановки в Мусхафе и смысл, твёрдые и мягкие буквы (خ ص ض غ ط ق ظ, пять степеней), ра, лям и алиф
• ⭐ Избранные правила
• Проверка чтения: остановка на сукуне, пауза для вдоха и повтор последних слов больше не ошибки
</ru-RU>

<bn-BD>
Quran Muallem 1.10.0
• তাজবীদ গাইড: যেকোনো উদাহরণ চাপুন, বাছাই করা শাইখের কণ্ঠে শুনুন (বিকল্প: শব্দে শব্দে বা পুরো আয়াত)
• নতুন: সুকূনে ওয়াকফ ও ইবতিদা, মুসহাফের ওয়াকফ চিহ্ন ও অর্থ, পুর ও পাতলা হরফ (خ ص ض غ ط ق ظ, পাঁচ স্তর), রা, লাম ও আলিফ
• ⭐ প্রিয় নিয়ম
• তিলাওয়াত যাচাই: সুকূনে থামা, শ্বাসের বিরতি ও শেষ শব্দ পুনরাবৃত্তি আর ভুল নয়
</bn-BD>

<sq>
Quran Muallem 1.10.0
• Udhëzuesi i texhvidit: prek një shembull dhe dëgjoje me zërin e shejhut të zgjedhur (rezervë: fjalë për fjalë ose ajeti i plotë)
• E re: ndalimi me sukun dhe rifillimi, shenjat e ndalimit në Mus’haf dhe kuptimi, shkronjat e trasha dhe të holla (خ ص ض غ ط ق ظ, pesë shkallë), ra, lam dhe elif
• ⭐ Rregullat e preferuara
• Kontrolli: ndalimi me sukun, pushimi për frymë dhe përsëritja e fjalëve të fundit nuk janë më gabime
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.10.0
• Vodič za tedžvid: dodirni primjer i poslušaj ga glasom odabranog šejha (rezerva: riječ po riječ ili cijeli ajet)
• Novo: vakf sa sukunom i ponovni početak, znakovi vakfa u Mushafu i značenje, debela i tanka slova (خ ص ض غ ط ق ظ, pet stepeni), ra, lam i elif
• ⭐ Omiljena pravila
• Provjera učenja: zastajanje sa sukunom, pauza za dah i ponavljanje zadnjih riječi više nisu greške
```
