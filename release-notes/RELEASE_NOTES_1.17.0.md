# Quran Muallem 1.17.0 – Release Notes (versionCode 48)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- v47: Kindermodus als eigenes Layout (`KidsLayoutTemplate`, `KidsHomeView`, `KidsMushafView` – eine Sura pro Seite, `KidsSettingsView` – nur 4 Bereiche, Eltern-Daten unerreichbar), Kinder-Themes sky/garden/night (`settings.kidsTheme`).
- v48: `src/lib/stories.ts` + `src/data/stories(1, 2, 3).json` (19 Propheten, 6 Quran-Geschichten, ar/de/en), `ProphetsJourneyView`, `StoryReaderView`, `StoriesView`, Vorlesen `StoryAudioNarrator.ts` (TTS, Web-Speech-Fallback).
- Alles bis v46 unverändert erhalten.

```
<en-US>
New in 1.17:
• Quran Stories & Stories of the Prophets: an illustrated journey from Adam to Muhammad ﷺ (19 stations) and 6 Quran stories, with linked verses (Sheikh audio, open in Mushaf) and a lesson.
• Read-aloud in Arabic, German and English, speed 0.8–1.2x, the spoken paragraph is highlighted.
• Kids Mode as its own storybook world: Kids Mushaf with one surah per page, 3 colour themes and child-locked settings that protect your progress.
</en-US>

<de-DE>
Neu in 1.17:
• Quran- & Prophetengeschichten: eine bebilderte Reise von Adam bis Muhammad ﷺ (19 Stationen) und 6 Quran-Geschichten, mit Āyāt (Scheich-Audio, im Mushaf öffnen) und einer Lehre.
• Vorlesen auf Arabisch, Deutsch und Englisch, Tempo 0,8–1,2x, der gelesene Absatz wird hervorgehoben.
• Kindermodus als eigene Bilderbuchwelt: Kinder-Mushaf mit einer Sura pro Seite, 3 Farbwelten und kindersichere Einstellungen, die deinen Fortschritt schützen.
</de-DE>

<ar>
جديد في 1.17:
• قصص القرآن وقصص الأنبياء: رحلة مصوّرة من آدم عليه السلام إلى محمد ﷺ (19 محطة) و6 قصص من القرآن، مع الآيات المرتبطة (صوت الشيخ والفتح في المصحف) والعبرة.
• الاستماع للقصة بالعربية والألمانية والإنجليزية بسرعة 0.8–1.2 مع تمييز الفقرة المقروءة.
• وضع الأطفال عالم قصصي مستقل: مصحف الأطفال بسورة واحدة في كل صفحة، و3 مظاهر، وإعدادات آمنة للأطفال تحمي تقدّمك.
</ar>

<fr-FR>
Nouveau en 1.17 :
• Récits du Coran et des prophètes : un voyage illustré d'Adam à Muhammad ﷺ (19 étapes) et 6 récits du Coran, avec versets (audio du cheikh, ouverture dans le Mushaf) et une leçon.
• Lecture à voix haute en arabe, allemand et anglais, vitesse 0,8–1,2x, paragraphe surligné.
• Mode enfants en univers de livre d'images : Mushaf avec une sourate par page, 3 thèmes et réglages verrouillés qui protègent votre progression.
</fr-FR>

<tr-TR>
1.17'de yeni:
• Kur'an ve Peygamber Kıssaları: Âdem'den Hz. Muhammed'e ﷺ resimli bir yolculuk (19 durak) ve 6 Kur'an kıssası; ilgili âyetler (hoca sesi, Mushafta aç) ve ders.
• Arapça, Almanca ve İngilizce sesli okuma, hız 0,8–1,2x, okunan paragraf vurgulanır.
• Çocuk modu ayrı bir masal dünyası: her sayfada bir sure olan çocuk Mushafı, 3 renk teması ve ilerlemeni koruyan çocuk kilitli ayarlar.
</tr-TR>

<ur>
1.17 میں نیا:
• قرآنی قصے اور انبیاء کے قصے: آدمؑ سے محمد ﷺ تک تصویری سفر (19 پڑاؤ) اور قرآن کے 6 قصے، متعلقہ آیات (شیخ کی آواز، مصحف میں کھولیں) اور سبق کے ساتھ۔
• عربی، جرمن اور انگریزی میں سنیں، رفتار 0.8–1.2، پڑھا جانے والا پیراگراف نمایاں۔
• بچوں کا موڈ الگ کہانیوں کی دنیا: ہر صفحے پر ایک سورت والا بچوں کا مصحف، 3 رنگ اور محفوظ ترتیبات جو آپ کی پیش رفت بچاتی ہیں۔
</ur>

<id>
Baru di 1.17:
• Kisah Al-Qur'an & Kisah Para Nabi: perjalanan bergambar dari Adam hingga Muhammad ﷺ (19 pemberhentian) dan 6 kisah Al-Qur'an, dengan ayat terkait (suara syekh, buka di Mushaf) dan hikmah.
• Dibacakan dalam bahasa Arab, Jerman dan Inggris, kecepatan 0,8–1,2x, paragraf yang dibaca disorot.
• Mode anak jadi dunia buku cerita: Mushaf anak satu surah per halaman, 3 tema warna dan pengaturan terkunci yang melindungi progres Anda.
</id>

<ms>
Baharu dalam 1.17:
• Kisah al-Quran & Kisah Para Nabi: perjalanan bergambar dari Adam hingga Muhammad ﷺ (19 hentian) dan 6 kisah al-Quran, dengan ayat berkaitan (suara syeikh, buka dalam Mushaf) dan pengajaran.
• Dibacakan dalam bahasa Arab, Jerman dan Inggeris, kelajuan 0.8–1.2x, perenggan yang dibaca diserlahkan.
• Mod kanak-kanak jadi dunia buku cerita: Mushaf satu surah setiap halaman, 3 tema dan tetapan berkunci yang melindungi kemajuan anda.
</ms>

<es-ES>
Novedades en 1.17:
• Historias del Corán y de los profetas: un viaje ilustrado de Adán a Muhammad ﷺ (19 paradas) y 6 historias del Corán, con aleyas (audio del jeque, abrir en el Mushaf) y una lección.
• Lectura en voz alta en árabe, alemán e inglés, velocidad 0,8–1,2x, se resalta el párrafo leído.
• Modo infantil como mundo de cuento: Mushaf con una sura por página, 3 temas y ajustes bloqueados que protegen tu progreso.
</es-ES>

<ru-RU>
Новое в 1.17:
• Истории Корана и пророков: иллюстрированный путь от Адама до Мухаммада ﷺ (19 остановок) и 6 историй Корана, с аятами (голос шейха, открыть в Мусхафе) и уроком.
• Озвучка на арабском, немецком и английском, скорость 0,8–1,2x, читаемый абзац подсвечивается.
• Детский режим — отдельный мир сказки: Мусхаф по одной суре на страницу, 3 темы и защищённые настройки, сохраняющие ваш прогресс.
</ru-RU>

<bn-BD>
১.১৭-এ নতুন:
• কুরআনের কাহিনি ও নবীদের কাহিনি: আদম থেকে মুহাম্মদ ﷺ পর্যন্ত সচিত্র যাত্রা (১৯টি স্টপ) ও কুরআনের ৬টি কাহিনি, সংশ্লিষ্ট আয়াত (শাইখের কণ্ঠ, মুসহাফে খোলা) ও শিক্ষাসহ।
• আরবি, জার্মান ও ইংরেজিতে শোনা, গতি ০.৮–১.২x, পঠিত অনুচ্ছেদ চিহ্নিত।
• শিশু মোড আলাদা গল্পের জগৎ: প্রতি পৃষ্ঠায় এক সূরার শিশু মুসহাফ, ৩টি রং ও অগ্রগতি রক্ষাকারী নিরাপদ সেটিংস।
</bn-BD>

<sq>
E re në 1.17:
• Tregimet e Kur'anit dhe të profetëve: një udhëtim i ilustruar nga Ademi te Muhamedi ﷺ (19 ndalesa) dhe 6 tregime nga Kur'ani, me ajete (zëri i hoxhës, hape në Mus'haf) dhe mësim.
• Lexim me zë në arabisht, gjermanisht dhe anglisht, shpejtësia 0,8–1,2x, paragrafi i lexuar theksohet.
• Modaliteti për fëmijë si botë përrallash: Mus'haf me një sure për faqe, 3 tema dhe cilësime të kyçura që mbrojnë progresin.
</sq>
```

Bosnisch (Website / Social Media):

```
Novo u 1.17:
• Kur'anske priče i priče o poslanicima: ilustrovano putovanje od Adema do Muhammeda ﷺ (19 stanica) i 6 kur'anskih priča, s ajetima (glas šejha, otvori u Mushafu) i poukom.
• Čitanje naglas na arapskom, njemačkom i engleskom, brzina 0,8–1,2x, čitani pasus je istaknut.
• Dječiji način kao svijet slikovnice: Mushaf s jednom surom po stranici, 3 teme i zaključane postavke koje štite tvoj napredak.
```
