# Quran Muallem 1.20.0 – Release Notes (versionCode 53)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Einheitliche Kopfzeile (Burger, Logo, voller Name, A−/A+) und 4-Tab-Leiste auf Start, Mushaf, Rezitieren und Begleiter; der Begleiter läuft inline.
- `SanctuarySheet`: alle Einstellungs-Seiten, Untermenüs und frühere Popups (`GoldDialog`) sind Vollbild-Ansichten mit Zurück-Pille, zentriertem Titel und X. Hub-Seiten nutzen `SubViewBar`.
- Sprache nur noch in Einstellungen; das Adhan-Menü öffnet die Gebetszeiten.
- Geschichten und Kinder-Tafsir als Sprach-Overlays in `src/data/storiesI18n` und `src/data/kidsTafsirI18n` (13 Sprachen); Erwachsene sehen Kontext und Reflexionen.
- `MiracleIcon` für 19 Propheten; keine 4-zackigen Funkel-Symbole mehr (Test `v53.test.ts`).
- Einstellung `instantCorrection` (Standard an): rotes Wort, Regel-Ansage, danach Sheikh-Audio.

```
<en-US>
• Same header and 4-tab bar on Home, Mushaf, Recite and Companion
• Every settings page and sub-menu now opens full screen with Back, title and ✕
• Language moved to Settings → App appearance
• Prophet and Quran stories plus kids tafsir in all 13 languages
• Adult stories: context, narrative, verses with Sheikh audio, reflections
• Miracle icon for every prophet
• Instant correction: a wrong word turns red, its rule is named, then the Sheikh recites it
• Tajweed scholar notice
</en-US>

<de-DE>
• Gleiche Kopfzeile und 4-Tab-Leiste in Start, Mushaf, Rezitieren und Begleiter
• Alle Einstellungen und Untermenüs öffnen im Vollbild mit Zurück, Titel und ✕
• Sprache jetzt unter Einstellungen → App-Aussehen
• Propheten- und Koran-Geschichten sowie Kinder-Tafsir in allen 13 Sprachen
• Erwachsenen-Geschichten: Kontext, Erzählung, Verse mit Sheikh-Audio, Lehren
• Wunder-Symbol für jeden Propheten
• Sofortkorrektur: falsches Wort wird rot, Regel wird genannt, dann rezitiert der Sheikh
</de-DE>

<ar>
• شريط علوي وشريط تبويبات موحّد في الرئيسية والمصحف والتسميع والمرافق
• كل صفحات الإعدادات والقوائم الفرعية تفتح بملء الشاشة مع رجوع وعنوان و✕
• اللغة الآن في الإعدادات ← مظهر التطبيق
• قصص الأنبياء والقرآن وتفسير الأطفال بـ١٣ لغة
• قصص الكبار: السياق التاريخي، السرد، الآيات بصوت الشيخ، والعِبر
• رمز معجزة لكل نبي
• تصحيح فوري: الكلمة الخاطئة تُلوَّن بالأحمر ويُذكر الحكم ثم يقرؤها الشيخ
• تنبيه: التجويد يُتلقّى من شيخ متقن
</ar>

<fr-FR>
• Même en-tête et barre à 4 onglets sur Accueil, Mushaf, Réciter et Compagnon
• Tous les réglages et sous-menus s'ouvrent en plein écran avec Retour, titre et ✕
• Langue : Réglages → Apparence de l'app
• Histoires des prophètes et du Coran et tafsir enfants en 13 langues
• Histoires adultes : contexte, récit, versets avec audio du cheikh, leçons
• Icône de miracle pour chaque prophète
• Correction instantanée : le mot erroné passe en rouge, la règle est annoncée, puis le cheikh le récite
</fr-FR>

<tr-TR>
• Ana sayfa, Mushaf, Ezber ve Yoldaş'ta aynı üst çubuk ve 4 sekme
• Tüm ayarlar ve alt menüler Geri, başlık ve ✕ ile tam ekran açılır
• Dil artık Ayarlar → Uygulama görünümü'nde
• Peygamber ve Kur'an kıssaları ile çocuk tefsiri 13 dilde
• Yetişkin kıssaları: tarihî bağlam, anlatım, hoca sesiyle ayetler, dersler
• Her peygamber için mucize simgesi
• Anında düzeltme: yanlış kelime kırmızı olur, kural söylenir, ardından hoca okur
</tr-TR>

<ur>
• ہوم، مصحف، تسمیع اور ساتھی میں ایک جیسا اوپری بار اور 4 ٹیب
• تمام سیٹنگز اور ذیلی مینو اب واپس، عنوان اور ✕ کے ساتھ پوری اسکرین پر کھلتے ہیں
• زبان اب سیٹنگز ← ایپ کی شکل میں
• انبیاء اور قرآن کے قصے اور بچوں کی تفسیر 13 زبانوں میں
• بڑوں کے قصے: تاریخی پس منظر، بیان، شیخ کی آواز میں آیات، اسباق
• ہر نبی کے لیے معجزے کا نشان
• فوری تصحیح: غلط لفظ سرخ ہو جاتا ہے، قاعدہ بتایا جاتا ہے، پھر شیخ پڑھتے ہیں
</ur>

<id>
• Header dan 4 tab yang sama di Beranda, Mushaf, Setoran dan Pendamping
• Semua pengaturan dan sub-menu kini layar penuh dengan Kembali, judul dan ✕
• Bahasa kini di Pengaturan → Tampilan aplikasi
• Kisah nabi dan Al-Qur'an serta tafsir anak dalam 13 bahasa
• Kisah dewasa: konteks sejarah, narasi, ayat dengan audio syekh, pelajaran
• Ikon mukjizat untuk setiap nabi
• Koreksi instan: kata yang salah menjadi merah, hukumnya disebut, lalu syekh membacanya
</id>

<ms>
• Pengepala dan 4 tab yang sama di Utama, Mushaf, Tasmik dan Peneman
• Semua tetapan dan sub-menu kini skrin penuh dengan Kembali, tajuk dan ✕
• Bahasa kini di Tetapan → Penampilan aplikasi
• Kisah nabi dan al-Quran serta tafsir kanak-kanak dalam 13 bahasa
• Kisah dewasa: konteks sejarah, naratif, ayat dengan audio syeikh, pengajaran
• Ikon mukjizat untuk setiap nabi
• Pembetulan segera: perkataan salah menjadi merah, hukumnya disebut, kemudian syeikh membacanya
</ms>

<es-ES>
• Misma cabecera y barra de 4 pestañas en Inicio, Mushaf, Recitar y Compañero
• Todos los ajustes y submenús se abren a pantalla completa con Atrás, título y ✕
• Idioma: Ajustes → Apariencia de la app
• Historias de los profetas y del Corán y tafsir infantil en 13 idiomas
• Historias para adultos: contexto, relato, aleyas con audio del jeque, reflexiones
• Icono del milagro de cada profeta
• Corrección inmediata: la palabra errónea se pone en rojo, se nombra la regla y el jeque la recita
</es-ES>

<ru-RU>
• Единая шапка и 4 вкладки на Главной, в Мусхафе, Чтении и Спутнике
• Все настройки и подменю открываются на весь экран с кнопками Назад и ✕
• Язык теперь в Настройки → Внешний вид приложения
• Истории пророков и Корана и детский тафсир на 13 языках
• Для взрослых: исторический контекст, повествование, аяты с голосом шейха, уроки
• Значок чуда для каждого пророка
• Мгновенная поправка: ошибочное слово краснеет, называется правило, затем его читает шейх
</ru-RU>

<bn-BD>
• হোম, মুসহাফ, তিলাওয়াত ও সঙ্গীতে একই হেডার ও ৪টি ট্যাব
• সব সেটিংস ও সাব-মেনু এখন ফিরুন, শিরোনাম ও ✕ সহ পূর্ণ স্ক্রিনে খোলে
• ভাষা এখন সেটিংস → অ্যাপের চেহারায়
• নবী ও কুরআনের কাহিনি এবং শিশুদের তাফসির ১৩টি ভাষায়
• বড়দের কাহিনি: ঐতিহাসিক প্রেক্ষাপট, বর্ণনা, শাইখের কণ্ঠে আয়াত, শিক্ষা
• প্রতিটি নবীর মুজিযার আইকন
• তাৎক্ষণিক সংশোধন: ভুল শব্দ লাল হয়, নিয়ম বলা হয়, তারপর শাইখ পড়েন
</bn-BD>

<sq>
• E njëjta kokë dhe 4 skeda në Kreu, Mushaf, Recitim dhe Shoqërues
• Të gjitha cilësimet dhe nënmenytë hapen në ekran të plotë me Prapa, titull dhe ✕
• Gjuha tani te Cilësimet → Pamja e aplikacionit
• Tregimet e profetëve dhe të Kuranit dhe tefsiri për fëmijë në 13 gjuhë
• Për të rriturit: konteksti historik, rrëfimi, ajetet me audio të hoxhës, mësimet
• Ikona e mrekullisë për çdo profet
• Korrigjim i menjëhershëm: fjala e gabuar bëhet e kuqe, emërtohet rregulli, pastaj e lexon hoxha
</sq>
```

Bosnisch (Website / Social Media):

```
• Ista zaglavlja i 4 kartice na Početnoj, Mushafu, Učenju i Pratiocu
• Sve postavke i podmeniji otvaraju se preko cijelog ekrana s Nazad, naslovom i ✕
• Jezik je sada u Postavke → Izgled aplikacije
• Priče o poslanicima i Kur'anu te dječiji tefsir na 13 jezika
• Za odrasle: historijski kontekst, pripovijest, ajeti s glasom šejha, pouke
• Ikona mudžize za svakog poslanika
• Trenutna ispravka: pogrešna riječ postaje crvena, navodi se pravilo, zatim je šejh prouči
```
