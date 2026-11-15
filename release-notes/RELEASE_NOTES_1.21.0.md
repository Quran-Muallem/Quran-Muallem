# Quran Muallem 1.21.0 – Release Notes (versionCode 55)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Burger-Menü: Sprach-Pille (`data-menu-language`) neben dem Profil öffnet Einstellungen → Sprache; «Gehe zu» (Sure/Juz/Seite, Seite vor/zurück) entfernt.
- Neu `src/components/stories/StoryEmblem.tsx`: Rub-el-Hizb-Medaillons mit Linienmotiv und Kalligrafie für die 6 Koran-Geschichten (Kacheln + Leser, nur Erwachsene); Raster `pb-[100px]`.
- Kinder-Mushaf: Live-Rezitation über `useRecitation` (erste 15 Verse), Wort-für-Wort-Farben, verdeckte Verse öffnen sich nach dem Lesen; Mikrofon-Knopf schwebt über der Kinder-Leiste.
- `VoiceWordFix`: keine TTS-Ansage mehr, rote Wörter spielen direkt das Sheikh-Wort-Audio.
- `SubViewBar` mit festem `--sx-header`-Hintergrund (vorher transparent).
- Enthält 1.20.1 (Android-Zurück-Taste).

```
<en-US>
• Language pill at the top of the menu, next to your profile
• «Go to» removed from the menu (the Mushaf keeps its own picker)
• Adult Quran stories now show gold-and-emerald calligraphy medallions instead of emojis
• Kids Mushaf: recite into the microphone and see every word light up – green, yellow, red
• Corrections play only the Sheikh's real voice, no spoken pre-warning
• Android back button steps back one level
</en-US>

<de-DE>
• Sprach-Pille oben im Menü neben deinem Profil
• «Gehe zu» aus dem Menü entfernt (der Mushaf hat seine eigene Auswahl)
• Koran-Geschichten für Erwachsene mit goldgrünen Kalligrafie-Medaillons statt Emojis
• Kinder-Mushaf: ins Mikrofon lesen, jedes Wort leuchtet auf – grün, gelb, rot
• Korrekturen spielen nur die echte Stimme des Sheikhs, ohne Ansage vorher
• Android-Zurück geht eine Ebene zurück
</de-DE>

<ar>
• زر اللغة في أعلى القائمة بجانب ملفك الشخصي
• حذف «انتقل إلى» من القائمة (للمصحف أداة الاختيار الخاصة به)
• قصص القرآن للكبار بميداليات خطّية ذهبية وزمردية بدل الرموز التعبيرية
• مصحف الأطفال: اقرأ في الميكروفون وشاهد كل كلمة تُضاء – أخضر، أصفر، أحمر
• التصحيح بصوت الشيخ الحقيقي فقط دون تنبيه منطوق قبله
• زر الرجوع في أندرويد يرجع خطوة واحدة
</ar>

<fr-FR>
• Bouton de langue en haut du menu, à côté du profil
• «Aller à» retiré du menu (le Mushaf garde son propre sélecteur)
• Histoires du Coran pour adultes : médaillons calligraphiques or et émeraude au lieu des émojis
• Mushaf enfants : récite au micro, chaque mot s'illumine – vert, jaune, rouge
• Les corrections ne jouent que la voix réelle du cheikh, sans annonce
• Le bouton Retour d'Android revient d'un niveau
</fr-FR>

<tr-TR>
• Menünün üstünde, profilinin yanında dil düğmesi
• «Git» menüden kaldırıldı (Mushaf'ın kendi seçicisi var)
• Yetişkinler için Kur'an kıssaları: emoji yerine altın-zümrüt hat madalyonları
• Çocuk Mushaf'ı: mikrofona oku, her kelime yanar – yeşil, sarı, kırmızı
• Düzeltmelerde önceden sesli uyarı yok, sadece hocanın gerçek sesi
• Android geri tuşu bir seviye geri gider
</tr-TR>

<ur>
• مینو کے اوپر پروفائل کے ساتھ زبان کا بٹن
• «یہاں جائیں» مینو سے ہٹا دیا گیا (مصحف کا اپنا انتخاب موجود ہے)
• بڑوں کے قرآنی قصوں میں ایموجی کی جگہ سنہری و زمردی خطاطی کے تمغے
• بچوں کا مصحف: مائیکروفون میں پڑھو اور ہر لفظ روشن ہو – سبز، پیلا، سرخ
• تصحیح میں صرف شیخ کی اصل آواز، پہلے کوئی اعلان نہیں
• اینڈرائیڈ کا واپس بٹن ایک قدم پیچھے جاتا ہے
</ur>

<id>
• Tombol bahasa di atas menu, di samping profil
• «Pergi ke» dihapus dari menu (Mushaf punya pemilihnya sendiri)
• Kisah Al-Qur'an dewasa kini dengan medali kaligrafi emas-zamrud, bukan emoji
• Mushaf anak: baca ke mikrofon, setiap kata menyala – hijau, kuning, merah
• Koreksi hanya memutar suara asli syekh, tanpa peringatan suara
• Tombol Kembali Android mundur satu tingkat
</id>

<ms>
• Butang bahasa di atas menu, di sebelah profil
• «Pergi ke» dibuang dari menu (Mushaf ada pemilih sendiri)
• Kisah al-Quran dewasa kini dengan medali khat emas-zamrud, bukan emoji
• Mushaf kanak-kanak: baca ke mikrofon, setiap perkataan bercahaya – hijau, kuning, merah
• Pembetulan hanya memainkan suara sebenar syeikh, tanpa amaran suara
• Butang Kembali Android undur satu tahap
</ms>

<es-ES>
• Botón de idioma arriba del menú, junto a tu perfil
• «Ir a» eliminado del menú (el Mushaf tiene su propio selector)
• Historias del Corán para adultos con medallones caligráficos oro y esmeralda en lugar de emojis
• Mushaf infantil: recita al micrófono y cada palabra se ilumina – verde, amarillo, rojo
• Las correcciones solo reproducen la voz real del jeque, sin aviso hablado
• El botón Atrás de Android retrocede un nivel
</es-ES>

<ru-RU>
• Кнопка языка вверху меню рядом с профилем
• «Перейти к» убрано из меню (у Мусхафа свой выбор)
• Истории Корана для взрослых: золотые и изумрудные каллиграфические медальоны вместо эмодзи
• Детский Мусхаф: читай в микрофон, каждое слово подсвечивается – зелёным, жёлтым, красным
• Поправки — только настоящий голос шейха, без голосового предупреждения
• Кнопка «Назад» в Android возвращает на один уровень
</ru-RU>

<bn-BD>
• মেনুর উপরে প্রোফাইলের পাশে ভাষার বোতাম
• মেনু থেকে «যান» সরানো হয়েছে (মুসহাফের নিজস্ব বাছাই আছে)
• বড়দের কুরআনের কাহিনিতে ইমোজির বদলে সোনালি-পান্না ক্যালিগ্রাফি পদক
• শিশুদের মুসহাফ: মাইক্রোফোনে পড়ো, প্রতিটি শব্দ জ্বলে ওঠে – সবুজ, হলুদ, লাল
• সংশোধনে শুধু শাইখের আসল কণ্ঠ, আগে কোনো ঘোষণা নেই
• অ্যান্ড্রয়েডের ফিরুন বোতাম এক ধাপ পিছনে যায়
</bn-BD>

<sq>
• Butoni i gjuhës në krye të menysë, pranë profilit
• «Shko te» u hoq nga menyja (Mushafi ka zgjedhësin e vet)
• Tregimet e Kuranit për të rriturit me medaljone kaligrafike ari dhe smeraldi në vend të emoji-ve
• Mushafi për fëmijë: lexo në mikrofon, çdo fjalë ndriçon – jeshile, e verdhë, e kuqe
• Korrigjimet luajnë vetëm zërin e vërtetë të hoxhës, pa paralajmërim
• Butoni Prapa i Android-it kthehet një nivel
</sq>
```

Bosnisch (Website / Social Media):

```
• Dugme za jezik na vrhu menija, pored profila
• «Idi na» uklonjeno iz menija (Mushaf ima svoj izbor)
• Kur'anske priče za odrasle s kaligrafskim medaljonima u zlatnoj i smaragdnoj boji umjesto emojija
• Dječiji Mushaf: uči u mikrofon, svaka riječ zasvijetli – zeleno, žuto, crveno
• Ispravke puštaju samo pravi glas šejha, bez najave
• Android dugme Nazad vraća jedan nivo
```
