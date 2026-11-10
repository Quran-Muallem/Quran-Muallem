# Quran Muallem 1.9.1 – Release Notes (versionCode 31)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Verbindungstest (`src/lib/connectionTest.ts`, `ConnectionTestPanel` unten in «المقرئين»): Plattform / Plugin, WebView-fetch (64 KB), <audio>-Metadaten, nativer Download (Android) – je mit Zeitlimit, Ergebnis kopierbar. Im Browser getestet: fetch HTTP 206, Audio 52 s.
- Geprüft: die vom Nutzer gebaute v29-APK (Quran-Muallem1, Version-29) enthält BackgroundAudioPlugin/-Service, playerLoad und den nativen Download sowie das v29-Web-Bundle. Dass trotzdem nichts lädt, deutet auf die Verbindung des Handys zu cdn.mp3quran.net.
- GitHub-Action „Android APK“: setup-android repariert (Paket „tools“ gibt es nicht mehr), Artefakt `Quran-Muallem-v<code>.apk`; mit Secret RELEASES_TOKEN zusätzlich Release „Version-<code>“ in Quran-Muallem/Quran-Muallem1.

```
<en-US>
Quran Muallem 1.9.1
• Reciters: new "Test connection" – checks on your phone how the recitation server is reached (WebView, audio, native download) and shows where it fails; result can be copied
• Everything from 1.9.0
</en-US>

<de-DE>
Quran Muallem 1.9.1
• Rezitatoren: neuer „Verbindung testen“ – prüft auf dem Handy, wie der Rezitations-Server erreicht wird (WebView, Audio, nativer Download) und zeigt, wo es hängt; Ergebnis kopierbar
• Alles aus 1.9.0
</de-DE>

<ar>
معلم القرآن 1.9.1
• المقرئون: «اختبار الاتصال» الجديد يفحص على جهازك الوصول إلى خادم التلاوات (المتصفح، الصوت، التنزيل الأصلي) ويُظهر موضع المشكلة مع إمكانية نسخ النتيجة
• كل ما في 1.9.0
</ar>

<fr-FR>
Quran Muallem 1.9.1
• Récitateurs : nouveau « Tester la connexion » – vérifie sur votre téléphone l'accès au serveur et montre où ça bloque ; résultat copiable
• Tout de la 1.9.0
</fr-FR>

<tr-TR>
Quran Muallem 1.9.1
• Kariler: yeni «Bağlantıyı test et» – telefonunda sunucuya erişimi denetler ve sorunun yerini gösterir; sonuç kopyalanabilir
• 1.9.0'daki her şey
</tr-TR>

<ur>
قرآن معلم 1.9.1
• قراء: نیا «کنکشن ٹیسٹ» — فون پر سرور تک رسائی جانچتا اور مسئلے کی جگہ دکھاتا ہے؛ نتیجہ کاپی ہو سکتا ہے
• 1.9.0 کی سب چیزیں
</ur>

<id>
Quran Muallem 1.9.1
• Qari: «Tes koneksi» baru – memeriksa akses ke server di ponselmu dan menunjukkan letak masalah; hasil bisa disalin
• Semua dari 1.9.0
</id>

<ms>
Quran Muallem 1.9.1
• Qari: «Uji sambungan» baharu – menyemak akses ke pelayan pada telefon anda dan menunjukkan di mana masalah; hasil boleh disalin
• Semua dari 1.9.0
</ms>

<es-ES>
Quran Muallem 1.9.1
• Recitadores: nuevo «Probar conexión» – comprueba en tu móvil el acceso al servidor y muestra dónde falla; resultado copiable
• Todo lo de 1.9.0
</es-ES>

<ru-RU>
Quran Muallem 1.9.1
• Чтецы: новая «Проверка связи» — проверяет на телефоне доступ к серверу и показывает, где сбой; результат можно скопировать
• Всё из 1.9.0
</ru-RU>

<bn-BD>
Quran Muallem 1.9.1
• কারী: নতুন «সংযোগ পরীক্ষা» — ফোনে সার্ভারে পৌঁছানো যাচাই করে সমস্যার জায়গা দেখায়; ফল কপি করা যায়
• 1.9.0-এর সবকিছু
</bn-BD>

<sq>
Quran Muallem 1.9.1
• Lexuesit: «Testo lidhjen» i ri – kontrollon në telefon qasjen te serveri dhe tregon ku ngec; rezultati kopjohet
• Gjithçka nga 1.9.0
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.9.1
• Učači: novo „Testiraj vezu“ – provjerava na telefonu pristup serveru i pokazuje gdje zapinje; rezultat se može kopirati
• Sve iz 1.9.0
```
