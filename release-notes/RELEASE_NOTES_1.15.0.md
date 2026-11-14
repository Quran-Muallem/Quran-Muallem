# Quran Muallem 1.15.0 – Release Notes (versionCode 46)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Fixes: Basmala/Surah-Banner im fließenden Mushaf als aufeinanderfolgende Blöcke (`BasmalaFlow`, keine feste Höhe); `.qm-native-colors` hält dunkle/pastellfarbene Flächen (Gehe-zu, Sitzungsauswertung, Salat/Hifdh, Kinderkarten) im Pergament- und Kinderthema lesbar; Statusleiste per `SystemBars` nach Hintergrundhelligkeit (`statusBarSync.ts`).
- «وضع الصلاة» → «رفيق الصلاة»; `CompanionView` mit Umschalter (رفيق الصلاة / المراجعة الحرة), hervorgehobener Knopf in der Tab-Leiste.
- Kindermodus: Schalter neben dem Logo und oben im Menü; `KidsHome` (nur 3 Karten), Kinder-Tab-Leiste, Āya-Tipp → `KidsTafsirDrawer`.
- Alles bis v45 unverändert erhalten.

```
<en-US>
New in 1.15:
• Salat Mode is now called «Salat Companion». Together with Hands-free Hifdh it has its own highlighted button in the tab bar, with a switch at the top.
• Kids Mode is always visible next to the logo and in the menu. In Kids Mode the home screen shows only Kids Mushaf, Kids Tafsir and the Star Journey; tapping a verse opens a simple kids tafsir with read-aloud.
• Fixed: Basmala overlapping at large font sizes, unreadable text in «Go to», status bar icons on light pages.
</en-US>

<de-DE>
Neu in 1.15:
• Der Salat-Modus heißt jetzt «Gebetsbegleiter». Zusammen mit freiem Hifdh hat er einen eigenen hervorgehobenen Knopf in der Leiste, mit Umschalter oben.
• Kindermodus immer sichtbar neben dem Logo und im Menü. Im Kindermodus zeigt der Start nur Kinder-Mushaf, Kinder-Tafsir und Sternen-Reise; Tippen auf eine Āya öffnet einen einfachen Kinder-Tafsir mit Vorlesen.
• Behoben: Basmala überlappt bei großer Schrift, unlesbarer Text in «Gehe zu», Statusleiste auf hellen Seiten.
</de-DE>

<ar>
جديد في 1.15:
• أصبح «وضع الصلاة» اسمه «رفيق الصلاة»، ومعه «المراجعة الحرة» في زر مميّز بشريط التنقل مع مبدّل في الأعلى.
• زر «وضع الأطفال» ظاهر دائمًا بجانب الشعار وفي القائمة. في وضع الأطفال تعرض الرئيسية فقط: مصحف الأطفال، تفسير للأطفال، رحلة النجوم للحفظ؛ والضغط على آية يفتح تفسيرًا مبسّطًا مع الاستماع.
• إصلاح: تداخل البسملة عند تكبير الخط، ووضوح النص في «انتقل إلى»، وأيقونات شريط الحالة على الصفحات الفاتحة.
</ar>

<fr-FR>
Nouveau en 1.15 :
• Le mode Salat s'appelle désormais « Compagnon de prière ». Avec le Hifdh mains libres, il a son propre bouton en évidence dans la barre, avec un sélecteur en haut.
• Le mode enfants est toujours visible près du logo et dans le menu. En mode enfants, l'accueil n'affiche que Mushaf, Tafsir et Voyage des étoiles ; toucher un verset ouvre un tafsir simple lu à voix haute.
• Corrigé : Basmala qui chevauche en grand texte, texte illisible dans « Aller à », barre d'état.
</fr-FR>

<tr-TR>
1.15'te yeni:
• Namaz modu artık «Namaz Arkadaşı». Serbest hıfz ile birlikte sekme çubuğunda vurgulu bir düğmesi ve üstte geçiş anahtarı var.
• Çocuk modu her zaman logonun yanında ve menüde. Çocuk modunda ana sayfa yalnızca Çocuk Mushafı, Çocuk Tefsiri ve Yıldız Yolculuğu'nu gösterir; bir âyete dokununca sesli basit tefsir açılır.
• Düzeltildi: büyük yazıda Besmele çakışması, «Git» penceresinde okunmayan metin, durum çubuğu simgeleri.
</tr-TR>

<ur>
1.15 میں نیا:
• «نماز موڈ» اب «نماز کا ساتھی» ہے۔ آزاد حفظ کے ساتھ اس کا ٹیب بار میں نمایاں بٹن ہے اور اوپر سوئچ۔
• بچوں کا موڈ ہمیشہ لوگو کے ساتھ اور مینو میں نظر آتا ہے۔ بچوں کے موڈ میں ہوم پر صرف بچوں کا مصحف، تفسیر اور ستاروں کا سفر؛ آیت پر ٹیپ سے آسان تفسیر سننے کے ساتھ کھلتی ہے۔
• درست: بڑے خط میں بسم اللہ کا اوورلیپ، «جائیں» میں ناقابلِ مطالعہ متن، اسٹیٹس بار آئیکن۔
</ur>

<id>
Baru di 1.15:
• Mode Salat kini bernama «Pendamping Salat». Bersama Hifdh bebas tangan, ia punya tombol menonjol di bilah tab dengan pengalih di atas.
• Mode anak selalu terlihat di samping logo dan di menu. Dalam mode anak, beranda hanya menampilkan Mushaf anak, Tafsir anak dan Perjalanan bintang; ketuk ayat untuk tafsir sederhana yang dibacakan.
• Diperbaiki: Basmalah bertumpuk pada huruf besar, teks tak terbaca di «Buka», ikon bilah status.
</id>

<ms>
Baharu dalam 1.15:
• Mod Solat kini dinamakan «Teman Solat». Bersama Hafazan bebas tangan, ia mempunyai butang menonjol di bar tab dengan penukar di atas.
• Mod kanak-kanak sentiasa kelihatan di sebelah logo dan dalam menu. Dalam mod kanak-kanak, laman utama hanya menunjukkan Mushaf, Tafsir dan Perjalanan bintang; ketik ayat untuk tafsir ringkas yang dibacakan.
• Dibaiki: Basmalah bertindih pada fon besar, teks sukar dibaca dalam «Pergi ke», ikon bar status.
</ms>

<es-ES>
Novedades en 1.15:
• El modo Salat ahora se llama «Compañero de oración». Junto al Hifdh manos libres tiene su propio botón destacado en la barra, con un selector arriba.
• El modo infantil siempre visible junto al logo y en el menú. En modo infantil, el inicio solo muestra Mushaf, Tafsir y Viaje de estrellas; tocar una aleya abre un tafsir sencillo leído en voz alta.
• Corregido: Basmala superpuesta con letra grande, texto ilegible en «Ir a», iconos de la barra de estado.
</es-ES>

<ru-RU>
Новое в 1.15:
• Режим намаза теперь называется «Спутник намаза». Вместе со свободным хифзом у него своя выделенная кнопка в панели и переключатель сверху.
• Детский режим всегда виден рядом с логотипом и в меню. В детском режиме на главной только детский Мусхаф, тафсир и звёздный путь; нажатие на аят открывает простой тафсир с озвучкой.
• Исправлено: наложение басмалы при крупном шрифте, нечитаемый текст в «Перейти», значки строки состояния.
</ru-RU>

<bn-BD>
১.১৫-এ নতুন:
• সালাত মোড এখন «সালাত সঙ্গী»। হ্যান্ডস-ফ্রি হিফজসহ ট্যাব বারে এর নিজস্ব উজ্জ্বল বোতাম ও ওপরে সুইচ।
• শিশু মোড সবসময় লোগোর পাশে ও মেনুতে দেখা যায়। শিশু মোডে হোমে শুধু শিশুদের মুসহাফ, তাফসির ও তারার যাত্রা; আয়াতে চাপ দিলে শোনার সুবিধাসহ সহজ তাফসির খোলে।
• ঠিক করা হয়েছে: বড় ফন্টে বিসমিল্লাহ ওভারল্যাপ, «যান»-এ অস্পষ্ট লেখা, স্ট্যাটাস বারের আইকন।
</bn-BD>

<sq>
E re në 1.15:
• Modaliteti i namazit tani quhet «Shoqëruesi i namazit». Bashkë me Hifdhin pa duar ka butonin e vet të theksuar në shirit dhe një ndërrues lart.
• Modaliteti për fëmijë gjithmonë i dukshëm pranë logos dhe në menu. Në të, faqja kryesore tregon vetëm Mus'hafin, Tefsirin dhe Udhëtimin me yje; prekja e një ajeti hap tefsir të thjeshtë me lexim me zë.
• Rregulluar: Besmeleja mbivendosej me shkronja të mëdha, teksti i palexueshëm te «Shko te», ikonat e shiritit.
</sq>
```

Bosnisch (Website / Social Media):

```
Novo u 1.15:
• Način namaza sada se zove «Pratilac namaza». Zajedno sa slobodnim hifzom ima svoje istaknuto dugme u traci i prekidač na vrhu.
• Dječiji način uvijek vidljiv pored logotipa i u meniju. U dječijem načinu početna prikazuje samo Mushaf, Tefsir i Putovanje sa zvjezdicama; dodir ajeta otvara jednostavan tefsir s čitanjem naglas.
• Ispravljeno: preklapanje Bismille pri velikom fontu, nečitljiv tekst u «Idi na», ikone statusne trake.
```
