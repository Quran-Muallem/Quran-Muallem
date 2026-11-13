# Quran Muallem 1.11.3 – Release Notes (versionCode 41)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Nur `src/data/adhanVoices.ts`: es bleiben `madinah` (Marwan Qassas, normal + Fajr) und `alafasy` (nur Fajr). Entfernt: `madinah_cc` (CC-BY-Aufnahme samt `public/adhan/madinah_cc.mp3` / `ios/madinah_cc.caf`) und die leeren Slots Makkah, Al-Aqsa, Abdul Basit, kurz/ruhig.
- Gespeicherte alte IDs fallen über `adhanFileFor` auf Madinah zurück (Tests in `v22.test.ts`).
- Rechte an beiden verbliebenen Aufnahmen: laut `public/adhan/CREDITS.md` vom App-Inhaber vor Veröffentlichung zu bestätigen.

```
<en-US>
Quran Muallem 1.11.3
• Adhan settings simplified: only two muezzin voices remain – Madinah (Sheikh Muhammad Marwan Qassas) and Sheikh Mishary Rashid Alafasy (Fajr Adhan)
• Voices without a recording were removed; an older selection automatically switches to the Madinah Adhan
</en-US>

<de-DE>
Quran Muallem 1.11.3
• Adhan-Einstellungen vereinfacht: nur noch zwei Muezzin-Stimmen – Madinah (Scheich Muhammad Marwan Qassas) und Scheich Mishary Rashid Alafasy (Fajr-Adhan)
• Stimmen ohne Aufnahme wurden entfernt; eine ältere Auswahl wechselt automatisch zum Madinah-Adhan
</de-DE>

<ar>
معلم القرآن 1.11.3
• تبسيط إعدادات الأذان: بقي صوتان فقط — المدينة المنورة (الشيخ محمد مروان قصاص) والشيخ مشاري راشد العفاسي (أذان الفجر)
• حُذفت الأصوات التي لا تسجيل لها، ويتحوّل الاختيار القديم تلقائيًا إلى أذان المدينة
</ar>

<fr-FR>
Quran Muallem 1.11.3
• Réglages de l'adhan simplifiés : il ne reste que deux voix – Médine (Cheikh Muhammad Marwan Qassas) et Cheikh Mishary Rashid Alafasy (adhan du Fajr)
• Les voix sans enregistrement ont été retirées ; un ancien choix passe automatiquement à l'adhan de Médine
</fr-FR>

<tr-TR>
Quran Muallem 1.11.3
• Ezan ayarları sadeleştirildi: yalnızca iki müezzin sesi kaldı – Medine (Şeyh Muhammed Mervan Kassas) ve Şeyh Mişari Raşid el-Afasi (sabah ezanı)
• Kaydı olmayan sesler kaldırıldı; eski bir seçim otomatik olarak Medine ezanına geçer
</tr-TR>

<ur>
قرآن معلم 1.11.3
• اذان کی ترتیبات آسان: اب صرف دو آوازیں — مدینہ منورہ (شیخ محمد مروان قصاص) اور شیخ مشاری راشد العفاسی (اذانِ فجر)
• بغیر ریکارڈنگ والی آوازیں ہٹا دی گئیں؛ پرانا انتخاب خود بخود اذانِ مدینہ پر چلا جاتا ہے
</ur>

<id>
Quran Muallem 1.11.3
• Pengaturan azan disederhanakan: kini hanya dua suara muazin – Madinah (Syekh Muhammad Marwan Qassas) dan Syekh Mishary Rashid Alafasy (azan Subuh)
• Suara tanpa rekaman dihapus; pilihan lama otomatis beralih ke azan Madinah
</id>

<ms>
Quran Muallem 1.11.3
• Tetapan azan dipermudah: kini hanya dua suara muazin – Madinah (Syeikh Muhammad Marwan Qassas) dan Syeikh Mishary Rashid Alafasy (azan Subuh)
• Suara tanpa rakaman dibuang; pilihan lama bertukar secara automatik kepada azan Madinah
</ms>

<es-ES>
Quran Muallem 1.11.3
• Ajustes del adhan simplificados: solo quedan dos voces – Medina (jeque Muhammad Marwan Qassas) y jeque Mishary Rashid Alafasy (adhan del Fajr)
• Se quitaron las voces sin grabación; una selección antigua pasa automáticamente al adhan de Medina
</es-ES>

<ru-RU>
Quran Muallem 1.11.3
• Настройки азана упрощены: осталось два голоса – Медина (шейх Мухаммад Марван Кассас) и шейх Мишари Рашид аль-Афаси (азан Фаджр)
• Голоса без записи удалены; прежний выбор автоматически переключается на азан Медины
</ru-RU>

<bn-BD>
Quran Muallem 1.11.3
• আযান সেটিংস সহজ করা হয়েছে: এখন শুধু দুটি কণ্ঠ – মদিনা (শায়খ মুহাম্মদ মারওয়ান কাসসাস) ও শায়খ মিশারি রাশিদ আল-আফাসি (ফজরের আযান)
• রেকর্ডিংহীন কণ্ঠগুলো সরানো হয়েছে; পুরোনো নির্বাচন স্বয়ংক্রিয়ভাবে মদিনার আযানে যায়
</bn-BD>

<sq>
Quran Muallem 1.11.3
• Cilësimet e ezanit u thjeshtuan: mbeten vetëm dy zëra – Medina (shejh Muhamed Mervan Kassas) dhe shejh Mishari Rashid El-Afasi (ezani i sabahut)
• Zërat pa regjistrim u hoqën; një zgjedhje e vjetër kalon automatikisht te ezani i Medinës
</sq>
```

Bosnisch (Website / Social Media):

```
Quran Muallem 1.11.3
• Postavke ezana pojednostavljene: ostala su samo dva glasa – Medina (šejh Muhammed Mervan Kassas) i šejh Mišari Rašid El-Afasi (sabahski ezan)
• Glasovi bez snimka su uklonjeni; stari izbor automatski prelazi na ezan iz Medine
```
