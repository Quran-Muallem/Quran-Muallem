# Quran Muallem 1.23.3 – Release Notes (versionCode 62)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Aufräum-Version ohne Funktionsänderung (Details in AGENTS.md v56.3): gemeinsamer Bewertungskern `useLiveJudgement` (Mushaf, Kinder-Mushaf, Tasmīʿ), `useDismissLayer` (Escape + Android-Zurück) für alle Overlays, Gebetszeit-Einstellungen / Übersetzungswahl / Suche als `SanctuarySheet`, doppeltes Burger-Menü entfernt, 43 ungenutzte UI-Dateien, 37 tote Funktionen, 37 ungenutzte Übersetzungsschlüssel, ungenutztes CSS entfernt; Bündel aufgeteilt (vendor / data).
- Prüfungen: tsc 0 Fehler, ESLint 0 Fehler, 329 Tests, App-Build ohne Warnungen; Pixelvergleich alt/neu für alle Kernansichten.
- Datenschutzerklärung geprüft: keine Änderung an Daten, Diensten, Berechtigungen oder Sensoren → Text unverändert (Stand 15.11.2026); App- und Web-Fassung neu erzeugt (`npm run legal`) und identisch.

```
<en-US>
• The Android back button now closes every window (search, verse menu, tafsir, prayer settings…) instead of leaving the app
• Search, translation choice and prayer settings open full screen with a clear ✕
• The «More» section shows its title in your language
• Under the hood: one shared recitation engine for Mushaf, Kids and Recite, lots of old code removed, faster loading
</en-US>

<de-DE>
• Die Android-Zurück-Taste schließt jetzt jedes Fenster (Suche, Vers-Menü, Tafsir, Gebetszeiten …), statt die App zu verlassen
• Suche, Übersetzungswahl und Gebetszeit-Einstellungen öffnen im Vollbild mit klarem ✕
• Der Bereich «Mehr» zeigt seinen Titel in deiner Sprache
• Unter der Haube: eine gemeinsame Rezitations-Engine für Mushaf, Kinder und Tasmīʿ, viel alter Code entfernt, schnelleres Laden
</de-DE>

<ar>
• زر الرجوع في أندرويد يغلق الآن كل نافذة (البحث، قائمة الآية، التفسير، إعدادات الصلاة…) بدل الخروج من التطبيق
• البحث واختيار الترجمة وإعدادات الصلاة تُفتح بملء الشاشة مع زر ✕ واضح
• قسم «المزيد» يعرض عنوانه بلغتك
• تحسينات داخلية: محرّك تلاوة واحد للمصحف والأطفال والتسميع، وحذف كثير من الشيفرة القديمة، وتحميل أسرع
</ar>

<fr-FR>
• Le bouton retour d'Android ferme désormais chaque fenêtre (recherche, menu du verset, tafsir, réglages de prière…) au lieu de quitter l'app
• Recherche, choix de traduction et réglages de prière s'ouvrent en plein écran avec un ✕ clair
• La section «Plus» affiche son titre dans ta langue
• En interne : un seul moteur de récitation, ancien code supprimé, chargement plus rapide
</fr-FR>

<tr-TR>
• Android geri tuşu artık uygulamadan çıkmak yerine her pencereyi kapatır (arama, ayet menüsü, tefsir, namaz ayarları…)
• Arama, meal seçimi ve namaz ayarları net bir ✕ ile tam ekran açılır
• «Daha fazla» bölümü başlığını senin dilinde gösterir
• Arka planda: Mushaf, çocuklar ve tilavet için tek bir motor, eski kodlar kaldırıldı, daha hızlı yükleme
</tr-TR>

<ur>
• اینڈرائیڈ کا واپس بٹن اب ایپ بند کرنے کے بجائے ہر ونڈو بند کرتا ہے (تلاش، آیت مینو، تفسیر، نماز کی ترتیبات…)
• تلاش، ترجمے کا انتخاب اور نماز کی ترتیبات واضح ✕ کے ساتھ پوری اسکرین پر کھلتی ہیں
• «مزید» حصہ اپنا عنوان آپ کی زبان میں دکھاتا ہے
• اندرونی بہتری: مصحف، بچوں اور تسمیع کے لیے ایک ہی انجن، پرانا کوڈ ہٹایا گیا، تیز لوڈنگ
</ur>

<id>
• Tombol kembali Android kini menutup setiap jendela (pencarian, menu ayat, tafsir, pengaturan salat…) alih-alih keluar dari aplikasi
• Pencarian, pilihan terjemahan, dan pengaturan salat terbuka layar penuh dengan ✕ yang jelas
• Bagian «Lainnya» menampilkan judul dalam bahasamu
• Di balik layar: satu mesin tilawah bersama, banyak kode lama dihapus, pemuatan lebih cepat
</id>

<ms>
• Butang kembali Android kini menutup setiap tetingkap (carian, menu ayat, tafsir, tetapan solat…) dan tidak keluar dari aplikasi
• Carian, pilihan terjemahan dan tetapan solat dibuka skrin penuh dengan ✕ yang jelas
• Bahagian «Lagi» memaparkan tajuk dalam bahasa anda
• Di sebalik tabir: satu enjin bacaan dikongsi, banyak kod lama dibuang, muatan lebih pantas
</ms>

<es-ES>
• El botón atrás de Android ahora cierra cada ventana (búsqueda, menú de aleya, tafsir, ajustes de oración…) en lugar de salir de la app
• Búsqueda, elección de traducción y ajustes de oración se abren a pantalla completa con un ✕ claro
• La sección «Más» muestra su título en tu idioma
• Por dentro: un solo motor de recitación, mucho código antiguo eliminado, carga más rápida
</es-ES>

<ru-RU>
• Кнопка «Назад» в Android теперь закрывает каждое окно (поиск, меню аята, тафсир, настройки намаза…), а не выходит из приложения
• Поиск, выбор перевода и настройки намаза открываются на весь экран с понятным ✕
• Раздел «Ещё» показывает заголовок на вашем языке
• Внутри: единый движок чтения для Мусхафа, детей и чтения наизусть, удалён старый код, быстрее загрузка
</ru-RU>

<bn-BD>
• অ্যান্ড্রয়েডের ব্যাক বোতাম এখন অ্যাপ বন্ধ না করে প্রতিটি উইন্ডো বন্ধ করে (অনুসন্ধান, আয়াত মেনু, তাফসির, নামাজের সেটিংস…)
• অনুসন্ধান, অনুবাদ বাছাই ও নামাজের সেটিংস স্পষ্ট ✕ সহ পূর্ণ পর্দায় খোলে
• «আরও» অংশ তোমার ভাষায় শিরোনাম দেখায়
• ভেতরের উন্নতি: মুসহাফ, শিশু ও তিলাওয়াতের জন্য একটি ইঞ্জিন, পুরনো কোড সরানো, দ্রুত লোডিং
</bn-BD>

<sq>
• Butoni prapa i Android tani mbyll çdo dritare (kërkimi, menyja e ajetit, tefsiri, cilësimet e namazit…) në vend që të dalë nga aplikacioni
• Kërkimi, zgjedhja e përkthimit dhe cilësimet e namazit hapen në ekran të plotë me ✕ të qartë
• Seksioni «Më shumë» e tregon titullin në gjuhën tënde
• Brenda: një motor i vetëm leximi, kod i vjetër i hequr, ngarkim më i shpejtë
</sq>
```

Bosnisch (Website / Social Media):

```
• Android dugme za nazad sada zatvara svaki prozor (pretraga, meni ajeta, tefsir, postavke namaza…) umjesto da izađe iz aplikacije
• Pretraga, izbor prijevoda i postavke namaza otvaraju se preko cijelog ekrana s jasnim ✕
• Odjeljak «Više» prikazuje naslov na tvom jeziku
• Ispod haube: jedan zajednički motor za učenje, uklonjen stari kod, brže učitavanje
```
