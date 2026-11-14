# Quran Muallem 1.19.0 – Release Notes (versionCode 52)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Enthält v51 (Vereinfachung: Kopfleiste mit A−/A+, Sprach-Schnellwahl, 4 Tabs, flaches Menü, Großdruck, AAA-Kontrast, Taschen-Rakʿa-Zähler mit Unten-Zeit + «التحيات»-Stummschaltung) und v52 („Warm Sanctuary“).
- Design-Tokens `--sx-*` in `styles.css` (hell: Pergament / weiße Karten; dunkel: Smaragd-Verlauf / Milchglas). Neue Bausteine: `HomeHero`, `ContinueSpotlight`, Bento-`HomeActionCards`, `companion/Studio.tsx`, `kids/KidsArt.tsx`.
- المرافق-Einrichtung ohne X: die untere Leiste bleibt sichtbar und schließt den Begleiter; während der Sitzung bleibt der Halte-Stopp.
- Gebetsnamen im Begleiter lokalisiert (`sp*`-Schlüssel); Audio-Status zeigt echten Bluetooth-Namen oder „nutzt Telefonmikrofon“.

```
<en-US>
• New warm design: parchment light and frosted emerald dark modes
• Home: greeting with next-prayer countdown, streak & memorization ring, "Continue reading" with listen button, clear tiles
• Ayah & reflection of the day with listen and share
• Companion studio: prayer cards with rak'ah dots, pocket illustrations, big start button
• Kids: storybook look, star meter, illustrated badges
• Simpler menu, Large Print mode, A−/A+, 4 tabs
• More reliable pocket rak'ah counter
</en-US>

<de-DE>
• Neues warmes Design: Pergament hell, Smaragd-Glas dunkel
• Start: Begrüßung mit Countdown zum nächsten Gebet, Serie & Hifdh-Ring, „Weiterlesen“ mit Anhören, klare Kacheln
• Āya & Besinnung des Tages mit Anhören und Teilen
• Begleiter-Studio: Gebetskarten mit Rakʿa-Punkten, Taschen-Bilder, großer Startknopf
• Kinder: Bilderbuch-Look, Sternen-Leiste, gemalte Abzeichen
• Einfacheres Menü, Großdruck, A−/A+, 4 Tabs
• Zuverlässigerer Rakʿa-Zähler in der Hosentasche
</de-DE>

<ar>
• تصميم دافئ جديد: رَقّ فاتح وزمرّدي زجاجي داكن
• الرئيسية: تحية مع العدّ للصلاة القادمة، الأيام المتتالية وحلقة الحفظ، «تابع القراءة» مع الاستماع، بطاقات واضحة
• آية وتأمل اليوم مع الاستماع والمشاركة
• استوديو المرافق: بطاقات الصلوات بنقاط الركعات، رسوم مكان الهاتف، زر بدء كبير
• الأطفال: شكل كتاب القصص، عدّاد النجوم، أوسمة مرسومة
• قائمة أبسط، وضع الخط الكبير، A−/A+، أربعة تبويبات
• عدّاد ركعات أدق في جيب البنطال
</ar>

<fr-FR>
• Nouveau design chaleureux : parchemin clair, émeraude givrée sombre
• Accueil : salutation avec compte à rebours de la prochaine prière, série et anneau de mémorisation, « Reprendre » avec écoute, tuiles claires
• Verset & méditation du jour (écoute, partage)
• Studio compagnon : cartes de prière avec points de rak'a, illustrations de poche, grand bouton
• Enfants : style livre d'images, étoiles, badges illustrés
• Menu simplifié, gros caractères, 4 onglets
</fr-FR>

<tr-TR>
• Yeni sıcak tasarım: açık parşömen, koyu zümrüt cam
• Ana sayfa: sonraki namaza geri sayımlı selam, seri ve hafızlık halkası, dinleme düğmeli "Okumaya devam", net kutular
• Günün âyeti ve tefekkürü: dinle, paylaş
• Arkadaş stüdyosu: rekât noktalı namaz kartları, cep çizimleri, büyük başlat düğmesi
• Çocuklar: masal kitabı görünümü, yıldız çubuğu, rozetler
• Daha sade menü, büyük yazı, 4 sekme
• Cepte daha güvenilir rekât sayacı
</tr-TR>

<ur>
• نیا گرم ڈیزائن: ہلکا پارچمنٹ اور گہرا زمردی شیشہ
• ہوم: اگلی نماز کی الٹی گنتی کے ساتھ سلام، تسلسل اور حفظ کا حلقہ، سننے کے بٹن کے ساتھ «پڑھنا جاری رکھیں»، واضح کارڈز
• آج کی آیت اور تدبر: سنیں اور شیئر کریں
• ساتھی اسٹوڈیو: رکعت نقطوں والے نماز کارڈز، جیب کی تصاویر، بڑا شروع بٹن
• بچے: کہانی کی کتاب کا انداز، ستاروں کا پیمانہ، بیجز
• آسان مینو، بڑا خط، ٤ ٹیبز
</ur>

<id>
• Desain hangat baru: perkamen terang, zamrud kaca gelap
• Beranda: salam dengan hitung mundur salat berikutnya, rangkaian & cincin hafalan, "Lanjutkan membaca" dengan tombol dengar, kartu jelas
• Ayat & renungan hari ini: dengar dan bagikan
• Studio pendamping: kartu salat dengan titik rakaat, ilustrasi saku, tombol mulai besar
• Anak: gaya buku cerita, meteran bintang, lencana
• Menu lebih sederhana, huruf besar, 4 tab
• Penghitung rakaat di saku lebih andal
</id>

<ms>
• Reka bentuk hangat baharu: perkamen cerah, zamrud kaca gelap
• Utama: salam dengan kiraan detik solat seterusnya, rentetan & cincin hafazan, "Sambung membaca" dengan butang dengar, kad jelas
• Ayat & renungan hari ini: dengar dan kongsi
• Studio teman: kad solat dengan titik rakaat, ilustrasi poket, butang mula besar
• Kanak-kanak: gaya buku cerita, meter bintang, lencana
• Menu lebih ringkas, tulisan besar, 4 tab
• Pengira rakaat dalam poket lebih tepat
</ms>

<es-ES>
• Nuevo diseño cálido: pergamino claro y esmeralda esmerilada oscura
• Inicio: saludo con cuenta atrás a la próxima oración, racha y anillo de memorización, «Seguir leyendo» con escucha, tarjetas claras
• Aleya y reflexión del día: escuchar y compartir
• Estudio del compañero: tarjetas de oración con puntos de rak'a, ilustraciones de bolsillo, gran botón
• Niños: estilo libro de cuentos, estrellas, insignias
• Menú más simple, letra grande, 4 pestañas
</es-ES>

<ru-RU>
• Новый тёплый дизайн: светлый пергамент и тёмное изумрудное стекло
• Главная: приветствие с отсчётом до намаза, серия и кольцо заучивания, «Продолжить чтение» с прослушиванием, понятные плитки
• Аят и размышление дня: слушать и делиться
• Студия помощника: карточки намазов с точками ракаатов, рисунки карманов, большая кнопка
• Дети: стиль книжки, шкала звёзд, значки
• Проще меню, крупный шрифт, 4 вкладки
</ru-RU>

<bn-BD>
• নতুন উষ্ণ ডিজাইন: হালকা পার্চমেন্ট ও গাঢ় পান্না কাচ
• হোম: পরবর্তী নামাজের কাউন্টডাউনসহ সালাম, ধারাবাহিকতা ও হিফজ রিং, শোনার বোতামসহ «পড়া চালিয়ে যান», স্পষ্ট কার্ড
• আজকের আয়াত ও চিন্তা: শুনুন ও শেয়ার করুন
• সঙ্গী স্টুডিও: রাকাত বিন্দুসহ নামাজ কার্ড, পকেটের ছবি, বড় শুরু বোতাম
• শিশু: গল্পের বইয়ের রূপ, তারার মিটার, ব্যাজ
• সহজ মেনু, বড় লেখা, ৪টি ট্যাব
</bn-BD>

<sq>
• Dizajn i ri i ngrohtë: pergamenë e çelur, smerald xhami i errët
• Kryefaqja: përshëndetje me numërim deri te namazi i radhës, seri dhe unazë hifzi, "Vazhdo leximin" me dëgjim, karta të qarta
• Ajeti dhe meditimi i ditës: dëgjo dhe ndaj
• Studio shoqëruese: karta namazi me pika rekatesh, ilustrime xhepi, buton i madh nisjeje
• Fëmijët: pamje libri përrallash, matës yjesh, stema
• Meny më e thjeshtë, shkrim i madh, 4 skeda
</sq>
```

Bosnisch (Website / Social Media):

```
• Novi topli dizajn: svijetli pergament i tamno smaragdno staklo
• Početna: selam s odbrojavanjem do sljedećeg namaza, niz i prsten hifza, „Nastavi čitati“ sa slušanjem, jasne kartice
• Ajet i razmišljanje dana: slušaj i podijeli
• Studio pratioca: kartice namaza s tačkama rekata, ilustracije džepa, veliko dugme za start
• Djeca: izgled slikovnice, mjerač zvjezdica, značke
• Jednostavniji meni, krupna slova, 4 kartice
• Pouzdaniji brojač rekata u džepu
```
