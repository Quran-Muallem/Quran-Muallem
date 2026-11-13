# Quran Muallem 1.13.0 – Release Notes (versionCode 43)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Neu: `src/lib/SalatMotionTracker.ts` (MotionCore: Neigung gegen Steh-Kalibrierung, Höhe aus Bewegungssegmenten, 1,2 s Haltezeit, Rakʿa-Zählung, «zu viel / zu wenig»), Sensoren über `@capacitor/motion` (neue Abhängigkeit, iOS-Erlaubnis im Start-Tap). Ton `public/salat/subhanallah.mp3` (Husary 37:159, Wörter 1–2).
- v42-Logik unverändert; nur ergänzt: `setPassive` / `syncRakah` / `motionMute` / `motionNewRakah` in `SalatPrayerTracker.ts`, Eröffnungs-Takbīr vor der Fātiḥa zählt nicht mehr als Rukūʿ.
- Getestet mit simulierten Sensordaten (Unit + Browser), noch nicht auf einem echten Handy in der Tasche.

```
<en-US>
Quran Muallem 1.13.0
• Salat Mode now counts the rak'aat with the motion sensors: choose the prayer (Fajr 2, Dhuhr/Asr/Isha 4, Maghrib 3, Qiyam 2–8 or open) and where the phone is (shirt, trouser or jacket pocket)
• Stand up for an extra rak'ah or sit down too early and a calm «SubhanAllah» reminds you
• Status: prayer • rak'ah • posture; prompting stays silent in ruku, sujud and the Fatihah-only rak'aat
</en-US>

<de-DE>
Quran Muallem 1.13.0
• Der Gebetsmodus zählt jetzt die Rakʿāt mit den Bewegungssensoren: Gebet wählen (Fajr 2, Dhuhr/Asr/Isha 4, Maghrib 3, Nachtgebet 2–8 oder offen) und wo das Handy steckt (Hemd-, Hosen- oder Jackentasche)
• Stehst du für eine Rakʿa zu viel auf oder setzt dich zu früh, erinnert ein ruhiges «Subḥān Allāh»
• Anzeige: Gebet • Rakʿa • Haltung
</de-DE>

<ar>
معلم القرآن 1.13.0
• وضع الصلاة يعدّ الركعات الآن بحساسات الحركة: اختر الصلاة (الفجر ٢، الظهر والعصر والعشاء ٤، المغرب ٣، قيام الليل ٢–٨ أو مفتوح) ومكان الهاتف (جيب القميص أو البنطال أو الجاكيت)
• إن قمت لركعة زائدة أو جلست قبل التمام ذكّرك صوت هادئ: «سبحان الله»
• يظهر: الصلاة • الركعة • الوضعية، ويبقى التذكير صامتًا في الركوع والسجود وفي ركعات الفاتحة فقط
</ar>

<fr-FR>
Quran Muallem 1.13.0
• Le mode Prière compte désormais les rakʿas avec les capteurs de mouvement : choisissez la prière (Fajr 2, Dhuhr/Asr/Isha 4, Maghrib 3, nuit 2–8 ou libre) et l'emplacement du téléphone (poche de chemise, de pantalon ou de veste)
• Une rakʿa de trop ou une assise trop tôt : un «Subhân Allâh» calme vous le rappelle
• Affichage : prière • rakʿa • posture
</fr-FR>

<tr-TR>
Quran Muallem 1.13.0
• Namaz Modu artık rekâtları hareket sensörleriyle sayıyor: namazı seç (Sabah 2, Öğle/İkindi/Yatsı 4, Akşam 3, gece namazı 2–8 veya serbest) ve telefonun yerini (gömlek, pantolon veya ceket cebi)
• Fazladan bir rekâta kalkarsan ya da erken oturursan sakin bir «Sübhânallah» hatırlatır
• Gösterge: namaz • rekât • duruş
</tr-TR>

<ur>
قرآن معلم 1.13.0
• نماز موڈ اب حرکت کے سینسر سے رکعات گنتا ہے: نماز منتخب کریں (فجر 2، ظہر/عصر/عشاء 4، مغرب 3، قیام اللیل 2–8 یا کھلا) اور فون کی جگہ (قمیص، پتلون یا جیکٹ کی جیب)
• زائد رکعت کے لیے کھڑے ہوں یا جلدی بیٹھ جائیں تو پرسکون «سبحان اللہ» یاد دلاتا ہے
• دکھاتا ہے: نماز • رکعت • وضع
</ur>

<id>
Quran Muallem 1.13.0
• Mode Salat kini menghitung rakaat dengan sensor gerak: pilih salat (Subuh 2, Zuhur/Asar/Isya 4, Magrib 3, qiyamul lail 2–8 atau bebas) dan letak ponsel (saku kemeja, celana, atau jaket)
• Berdiri untuk rakaat lebih atau duduk terlalu cepat: «Subhanallah» yang tenang mengingatkan
• Tampilan: salat • rakaat • posisi
</id>

<ms>
Quran Muallem 1.13.0
• Mod Solat kini mengira rakaat dengan sensor gerakan: pilih solat (Subuh 2, Zohor/Asar/Isyak 4, Maghrib 3, qiamullail 2–8 atau bebas) dan kedudukan telefon (poket baju, seluar atau jaket)
• Bangun untuk rakaat lebih atau duduk terlalu awal: «Subhanallah» yang tenang mengingatkan
• Paparan: solat • rakaat • kedudukan
</ms>

<es-ES>
Quran Muallem 1.13.0
• El modo Oración cuenta ahora las rakʿas con los sensores de movimiento: elige la oración (Fajr 2, Dhuhr/Asr/Isha 4, Maghrib 3, nocturna 2–8 o libre) y dónde está el móvil (bolsillo de camisa, pantalón o chaqueta)
• Si te levantas para una rakʿa de más o te sientas antes de tiempo, un «Subhan Allah» sereno te avisa
• Muestra: oración • rakʿa • postura
</es-ES>

<ru-RU>
Quran Muallem 1.13.0
• Режим намаза теперь считает ракааты по датчикам движения: выберите намаз (Фаджр 2, Зухр/Аср/Иша 4, Магриб 3, ночной 2–8 или свободно) и где телефон (карман рубашки, брюк или куртки)
• Встали на лишний ракаат или сели раньше — спокойное «Субхан Аллах» напомнит
• Показ: намаз • ракаат • положение
</ru-RU>

<bn-BD>
Quran Muallem 1.13.0
• সালাত মোড এখন গতি সেন্সর দিয়ে রাকাত গোনে: নামাজ বাছুন (ফজর ২, যোহর/আসর/এশা ৪, মাগরিব ৩, কিয়াম ২–৮ বা খোলা) ও ফোনের জায়গা (শার্ট, প্যান্ট বা জ্যাকেটের পকেট)
• অতিরিক্ত রাকাতে দাঁড়ালে বা আগেই বসে পড়লে শান্ত «সুবহানাল্লাহ» মনে করিয়ে দেয়
• দেখায়: নামাজ • রাকাত • ভঙ্গি
</bn-BD>

<sq>
Quran Muallem 1.13.0
• Modaliteti i Namazit tani numëron rekatet me sensorët e lëvizjes: zgjidh namazin (Sabahu 2, Dreka/Ikindia/Jacia 4, Akshami 3, nata 2–8 ose i hapur) dhe ku është telefoni (xhepi i këmishës, pantallonave ose xhaketës)
• Nëse ngrihesh për një rekat më shumë ose ulesh herët, një «Subhanallah» i qetë të kujton
• Shfaq: namazi • rekati • qëndrimi
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.13.0
• Namaski način sada broji rekate senzorima pokreta: odaberi namaz (sabah 2, podne/ikindija/jacija 4, akšam 3, noćni 2–8 ili otvoreno) i gdje je telefon (džep košulje, pantalona ili jakne)
• Ustaneš li na rekat viška ili sjedneš prerano, smireno «Subhanallah» te podsjeti
• Prikaz: namaz • rekat • položaj
```
