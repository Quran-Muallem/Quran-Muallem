# Quran Muallem 1.9.3 – Release Notes (versionCode 33)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- 1.9.3: Gehe-zu öffnet direkt auf allen 114 Suren (volle Namen, groß), Suche + Sprung zu Seite / Sure:Vers in einem Feld, zuletzt gelesen und Lesezeichen als Chips darüber; Kopfzeile mit vollem Surennamen, Seite/Juz/Hizb in eigener Zeile. Enthält den Android-Fix aus 1.9.2.
- Ursache aller Android-Hänger bei den Rezitatoren (seit 1.5): Capacitor-Plugins sind Proxies, die auch `then` beantworten. Aus einem Promise zurückgegeben (`backgroundAudio()`, `localNotifications()`, FileTransfer-Loader) ruft JavaScript `plugin.then(resolve, reject)` auf → nativer Aufruf einer nicht existierenden Methode → das Promise endet nie. Alles, was darauf wartete (Hub-Player, Downloads, Verbindungstest, Lock-Screen-Session), hing. Im Browser tritt es nicht auf (dort gibt es das Plugin nicht).
- Fix: `src/lib/thenSafe.ts` (Wrapper ohne `then`) an allen drei Stellen. Tests: `v31.test.ts` (nachgestelltes natives Plugin hängt ohne, löst mit Wrapper), `v31native.test.ts` (echtes @capacitor/core auf simulierter Android-Bridge: `backgroundAudio()` liefert das Plugin).
- Gefunden mit dem Verbindungstest aus 1.9.1: im Video des Nutzers blieb schon Schritt 1 (Plugin-Prüfung) hängen, bevor überhaupt Netzwerk benutzt wurde.

```
<en-US>
Quran Muallem 1.9.3
• Android: reciters now load, play and download – a hidden waiting bug (the app waited forever for its own audio plugin) is fixed
• Same fix for Adhan notifications and file downloads
• Background and lock-screen playback of the reciters library works again
• Go-To opens on all surahs with full names, search and recently read on top; full surah name in the Mushaf header
</en-US>

<de-DE>
Quran Muallem 1.9.3
• Android: Rezitatoren laden, spielen und lassen sich herunterladen – ein versteckter Fehler (die App wartete endlos auf ihr eigenes Audio-Plugin) ist behoben
• Gleiche Korrektur für Adhan-Benachrichtigungen und Datei-Downloads
• Wiedergabe im Hintergrund und auf dem Sperrbildschirm geht wieder
• Gehe-zu zeigt sofort alle Suren mit vollen Namen, Suche und zuletzt gelesen oben; voller Surenname in der Kopfzeile
</de-DE>

<ar>
معلم القرآن 1.9.3
• أندرويد: تعمل الآن تلاوات المقرئين تشغيلًا وتنزيلًا — أُصلح خطأ خفي كان التطبيق فيه ينتظر إضافته الصوتية بلا نهاية
• الإصلاح نفسه لإشعارات الأذان وتنزيل الملفات
• عاد التشغيل في الخلفية وعلى شاشة القفل
• «انتقل إلى» يعرض كل السور بأسمائها كاملة، والبحث وآخر ما قرأت في الأعلى؛ واسم السورة كاملًا في الشريط العلوي
</ar>

<fr-FR>
Quran Muallem 1.9.3
• Android : les récitateurs se chargent, jouent et se téléchargent – un bug caché (l'app attendait sans fin son module audio) est corrigé
• Même correctif pour les notifications d'Adhan et les téléchargements
• Lecture en arrière-plan et sur l'écran verrouillé rétablie
• « Aller à » affiche toutes les sourates, recherche et lus récemment en haut ; nom complet dans l'en-tête
</fr-FR>

<tr-TR>
Quran Muallem 1.9.3
• Android: kariler artık yükleniyor, çalıyor ve iniyor – uygulamanın kendi ses eklentisini sonsuza dek beklediği gizli hata düzeltildi
• Aynı düzeltme ezan bildirimleri ve dosya indirmeleri için
• Arka planda ve kilit ekranında oynatma yeniden çalışıyor
• Git, tüm sureleri tam adlarıyla gösterir; arama ve son okunanlar üstte; başlıkta tam sure adı
</tr-TR>

<ur>
قرآن معلم 1.9.3
• اینڈرائیڈ: قراء کی تلاوت اب چلتی اور ڈاؤن لوڈ ہوتی ہے — ایک چھپی خرابی (ایپ اپنے آڈیو پلگ ان کا لامتناہی انتظار کرتی تھی) درست
• یہی درستی اذان کی اطلاعات اور ڈاؤن لوڈز کے لیے
• پس منظر اور لاک اسکرین پر چلانا دوبارہ کام کرتا ہے
• «جائیں» میں تمام سورتیں پورے ناموں سے، اوپر تلاش اور حالیہ؛ ہیڈر میں مکمل نام
</ur>

<id>
Quran Muallem 1.9.3
• Android: bacaan qari kini termuat, diputar dan diunduh – bug tersembunyi (aplikasi menunggu plugin audionya tanpa akhir) diperbaiki
• Perbaikan sama untuk notifikasi azan dan unduhan
• Pemutaran di latar dan layar kunci berfungsi lagi
• Buka menampilkan semua surah dengan nama lengkap, pencarian dan terakhir dibaca di atas; nama lengkap di header
</id>

<ms>
Quran Muallem 1.9.3
• Android: bacaan qari kini dimuat, dimain dan dimuat turun – pepijat tersembunyi (aplikasi menunggu pemalam audionya tanpa henti) dibaiki
• Pembaikan sama untuk pemberitahuan azan dan muat turun
• Main di latar dan skrin kunci berfungsi semula
• Pergi memaparkan semua surah dengan nama penuh, carian dan baru dibaca di atas; nama penuh di pengepala
</ms>

<es-ES>
Quran Muallem 1.9.3
• Android: los recitadores cargan, suenan y se descargan – corregido un error oculto (la app esperaba sin fin a su propio módulo de audio)
• Mismo arreglo para notificaciones de adhan y descargas
• Vuelve la reproducción en segundo plano y en la pantalla de bloqueo
• Ir a muestra todas las suras con nombre completo, búsqueda y recientes arriba; nombre completo en la cabecera
</es-ES>

<ru-RU>
Quran Muallem 1.9.3
• Android: чтецы снова загружаются, играют и скачиваются — исправлена скрытая ошибка (приложение бесконечно ждало свой аудиоплагин)
• То же исправление для уведомлений об азане и загрузок
• Снова работает воспроизведение в фоне и на экране блокировки
• «Перейти» сразу показывает все суры с полными названиями, поиск и недавние сверху; полное название в шапке
</ru-RU>

<bn-BD>
Quran Muallem 1.9.3
• অ্যান্ড্রয়েড: কারীর তিলাওয়াত এখন চলে ও ডাউনলোড হয় — লুকানো ত্রুটি (অ্যাপ নিজের অডিও প্লাগইনের জন্য অবিরাম অপেক্ষা করত) ঠিক হয়েছে
• আজানের বিজ্ঞপ্তি ও ডাউনলোডেও একই সমাধান
• পটভূমি ও লক স্ক্রিনে বাজানো আবার কাজ করে
• «যান» সব সূরা পূর্ণ নামে দেখায়, উপরে খোঁজ ও সাম্প্রতিক; হেডারে পূর্ণ নাম
</bn-BD>

<sq>
Quran Muallem 1.9.3
• Android: lexuesit tani ngarkohen, luhen dhe shkarkohen – u rregullua një gabim i fshehur (aplikacioni priste pafundësisht shtojcën e vet audio)
• I njëjti rregullim për njoftimet e ezanit dhe shkarkimet
• Luajtja në sfond dhe në ekranin e kyçur punon sërish
• «Shko te» shfaq të gjitha suret me emër të plotë, kërkimi dhe të fundit lart; emri i plotë në kokë
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.9.3
• Android: učači se sada učitavaju, puštaju i preuzimaju – ispravljena skrivena greška (aplikacija je beskonačno čekala svoj audio dodatak)
• Ista ispravka za obavještenja o ezanu i preuzimanja
• Puštanje u pozadini i na zaključanom ekranu ponovo radi
• „Idi na“ odmah prikazuje sve sure punim imenom, pretraga i nedavno gore; puno ime sure u zaglavlju
```
