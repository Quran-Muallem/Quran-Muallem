# Quran Muallem 1.9.2 – Release Notes (versionCode 32)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Ursache aller Android-Hänger bei den Rezitatoren (seit 1.5): Capacitor-Plugins sind Proxies, die auch `then` beantworten. Aus einem Promise zurückgegeben (`backgroundAudio()`, `localNotifications()`, FileTransfer-Loader) ruft JavaScript `plugin.then(resolve, reject)` auf → nativer Aufruf einer nicht existierenden Methode → das Promise endet nie. Alles, was darauf wartete (Hub-Player, Downloads, Verbindungstest, Lock-Screen-Session), hing. Im Browser tritt es nicht auf (dort gibt es das Plugin nicht).
- Fix: `src/lib/thenSafe.ts` (Wrapper ohne `then`) an allen drei Stellen. Tests: `v31.test.ts` (nachgestelltes natives Plugin hängt ohne, löst mit Wrapper), `v31native.test.ts` (echtes @capacitor/core auf simulierter Android-Bridge: `backgroundAudio()` liefert das Plugin).
- Gefunden mit dem Verbindungstest aus 1.9.1: im Video des Nutzers blieb schon Schritt 1 (Plugin-Prüfung) hängen, bevor überhaupt Netzwerk benutzt wurde.

```
<en-US>
Quran Muallem 1.9.2
• Android: reciters now load, play and download – a hidden waiting bug (the app waited forever for its own audio plugin) is fixed
• Same fix for Adhan notifications and file downloads
• Background and lock-screen playback of the reciters library works again
</en-US>

<de-DE>
Quran Muallem 1.9.2
• Android: Rezitatoren laden, spielen und lassen sich herunterladen – ein versteckter Fehler (die App wartete endlos auf ihr eigenes Audio-Plugin) ist behoben
• Gleiche Korrektur für Adhan-Benachrichtigungen und Datei-Downloads
• Wiedergabe im Hintergrund und auf dem Sperrbildschirm geht wieder
</de-DE>

<ar>
معلم القرآن 1.9.2
• أندرويد: تعمل الآن تلاوات المقرئين تشغيلًا وتنزيلًا — أُصلح خطأ خفي كان التطبيق فيه ينتظر إضافته الصوتية بلا نهاية
• الإصلاح نفسه لإشعارات الأذان وتنزيل الملفات
• عاد التشغيل في الخلفية وعلى شاشة القفل
</ar>

<fr-FR>
Quran Muallem 1.9.2
• Android : les récitateurs se chargent, jouent et se téléchargent – un bug caché (l'app attendait sans fin son module audio) est corrigé
• Même correctif pour les notifications d'Adhan et les téléchargements
• Lecture en arrière-plan et sur l'écran verrouillé rétablie
</fr-FR>

<tr-TR>
Quran Muallem 1.9.2
• Android: kariler artık yükleniyor, çalıyor ve iniyor – uygulamanın kendi ses eklentisini sonsuza dek beklediği gizli hata düzeltildi
• Aynı düzeltme ezan bildirimleri ve dosya indirmeleri için
• Arka planda ve kilit ekranında oynatma yeniden çalışıyor
</tr-TR>

<ur>
قرآن معلم 1.9.2
• اینڈرائیڈ: قراء کی تلاوت اب چلتی اور ڈاؤن لوڈ ہوتی ہے — ایک چھپی خرابی (ایپ اپنے آڈیو پلگ ان کا لامتناہی انتظار کرتی تھی) درست
• یہی درستی اذان کی اطلاعات اور ڈاؤن لوڈز کے لیے
• پس منظر اور لاک اسکرین پر چلانا دوبارہ کام کرتا ہے
</ur>

<id>
Quran Muallem 1.9.2
• Android: bacaan qari kini termuat, diputar dan diunduh – bug tersembunyi (aplikasi menunggu plugin audionya tanpa akhir) diperbaiki
• Perbaikan sama untuk notifikasi azan dan unduhan
• Pemutaran di latar dan layar kunci berfungsi lagi
</id>

<ms>
Quran Muallem 1.9.2
• Android: bacaan qari kini dimuat, dimain dan dimuat turun – pepijat tersembunyi (aplikasi menunggu pemalam audionya tanpa henti) dibaiki
• Pembaikan sama untuk pemberitahuan azan dan muat turun
• Main di latar dan skrin kunci berfungsi semula
</ms>

<es-ES>
Quran Muallem 1.9.2
• Android: los recitadores cargan, suenan y se descargan – corregido un error oculto (la app esperaba sin fin a su propio módulo de audio)
• Mismo arreglo para notificaciones de adhan y descargas
• Vuelve la reproducción en segundo plano y en la pantalla de bloqueo
</es-ES>

<ru-RU>
Quran Muallem 1.9.2
• Android: чтецы снова загружаются, играют и скачиваются — исправлена скрытая ошибка (приложение бесконечно ждало свой аудиоплагин)
• То же исправление для уведомлений об азане и загрузок
• Снова работает воспроизведение в фоне и на экране блокировки
</ru-RU>

<bn-BD>
Quran Muallem 1.9.2
• অ্যান্ড্রয়েড: কারীর তিলাওয়াত এখন চলে ও ডাউনলোড হয় — লুকানো ত্রুটি (অ্যাপ নিজের অডিও প্লাগইনের জন্য অবিরাম অপেক্ষা করত) ঠিক হয়েছে
• আজানের বিজ্ঞপ্তি ও ডাউনলোডেও একই সমাধান
• পটভূমি ও লক স্ক্রিনে বাজানো আবার কাজ করে
</bn-BD>

<sq>
Quran Muallem 1.9.2
• Android: lexuesit tani ngarkohen, luhen dhe shkarkohen – u rregullua një gabim i fshehur (aplikacioni priste pafundësisht shtojcën e vet audio)
• I njëjti rregullim për njoftimet e ezanit dhe shkarkimet
• Luajtja në sfond dhe në ekranin e kyçur punon sërish
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.9.2
• Android: učači se sada učitavaju, puštaju i preuzimaju – ispravljena skrivena greška (aplikacija je beskonačno čekala svoj audio dodatak)
• Ista ispravka za obavještenja o ezanu i preuzimanja
• Puštanje u pozadini i na zaključanom ekranu ponovo radi
```
