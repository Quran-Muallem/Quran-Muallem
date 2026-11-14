# Quran Muallem 1.20.1 – Release Notes (versionCode 54)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Hotfix zu 1.20.0: Aus den Einstellungen (über das Burger-Menü geöffnet) kam man nicht mehr zurück.
- Neu `src/lib/backStack.ts` (`useBackLayer`): ein Schutz-Eintrag in der Browser-History, `popstate` schließt die oberste Ebene (Menü, Einstellungs-Unterseite, Einstellungen, Hub-Bereich, Geschichte, Begleiter, anderer Tab → Start). Funktioniert mit der Android-Zurück-Taste ohne zusätzliches Capacitor-Plugin.
- Einstellungs-Startseite: «‹ Menü»-Knopf öffnet das Burger-Menü wieder.

```
<en-US>
• Android back button and back gesture now step back one level: sub-page → Settings → Menu → previous screen
• Settings has a «‹ Menu» button to return to the menu
• Includes everything from 1.20.0: unified header and tab bar, full-screen settings, stories in 13 languages, instant correction
</en-US>

<de-DE>
• Android-Zurück-Taste und -Geste gehen jetzt eine Ebene zurück: Unterseite → Einstellungen → Menü → vorheriger Bildschirm
• Einstellungen haben einen «‹ Menü»-Knopf zurück zum Menü
• Enthält alles aus 1.20.0: einheitliche Kopfzeile und Tab-Leiste, Vollbild-Einstellungen, Geschichten in 13 Sprachen, Sofortkorrektur
</de-DE>

<ar>
• زر الرجوع وإيماءة الرجوع في أندرويد يرجعان الآن خطوة واحدة: الصفحة الفرعية ← الإعدادات ← القائمة ← الشاشة السابقة
• زر «‹ القائمة» في الإعدادات للعودة إلى القائمة
• يتضمن كل ما في 1.20.0: شريط علوي وتبويبات موحّدة، إعدادات بملء الشاشة، القصص بـ١٣ لغة، التصحيح الفوري
</ar>

<fr-FR>
• Le bouton et le geste Retour d'Android reviennent d'un niveau : sous-page → Réglages → Menu → écran précédent
• Bouton «‹ Menu» dans les Réglages
• Inclut tout de la 1.20.0 : en-tête et onglets unifiés, réglages plein écran, histoires en 13 langues, correction instantanée
</fr-FR>

<tr-TR>
• Android geri tuşu ve geri hareketi artık bir seviye geri gider: alt sayfa → Ayarlar → Menü → önceki ekran
• Ayarlar'da menüye dönmek için «‹ Menü» düğmesi
• 1.20.0'ın tamamını içerir: ortak üst çubuk ve sekmeler, tam ekran ayarlar, 13 dilde kıssalar, anında düzeltme
</tr-TR>

<ur>
• اینڈرائیڈ کا واپس بٹن اور اشارہ اب ایک قدم پیچھے جاتا ہے: ذیلی صفحہ ← سیٹنگز ← مینو ← پچھلی اسکرین
• سیٹنگز میں مینو پر واپسی کے لیے «‹ مینو» بٹن
• 1.20.0 کی تمام خصوصیات شامل: یکساں ہیڈر اور ٹیب، پوری اسکرین سیٹنگز، 13 زبانوں میں قصے، فوری تصحیح
</ur>

<id>
• Tombol dan gestur Kembali Android kini mundur satu tingkat: sub-halaman → Pengaturan → Menu → layar sebelumnya
• Tombol «‹ Menu» di Pengaturan
• Termasuk semua dari 1.20.0: header dan tab seragam, pengaturan layar penuh, kisah dalam 13 bahasa, koreksi instan
</id>

<ms>
• Butang dan gerak isyarat Kembali Android kini undur satu tahap: sub-halaman → Tetapan → Menu → skrin sebelumnya
• Butang «‹ Menu» dalam Tetapan
• Termasuk semua dari 1.20.0: pengepala dan tab seragam, tetapan skrin penuh, kisah dalam 13 bahasa, pembetulan segera
</ms>

<es-ES>
• El botón y el gesto Atrás de Android retroceden un nivel: subpágina → Ajustes → Menú → pantalla anterior
• Botón «‹ Menú» en Ajustes
• Incluye todo lo de 1.20.0: cabecera y pestañas unificadas, ajustes a pantalla completa, historias en 13 idiomas, corrección inmediata
</es-ES>

<ru-RU>
• Кнопка и жест «Назад» в Android теперь возвращают на один уровень: подстраница → Настройки → Меню → предыдущий экран
• Кнопка «‹ Меню» в Настройках
• Включает всё из 1.20.0: единая шапка и вкладки, настройки на весь экран, истории на 13 языках, мгновенная поправка
</ru-RU>

<bn-BD>
• অ্যান্ড্রয়েডের ফিরুন বোতাম ও জেসচার এখন এক ধাপ পিছনে যায়: সাব-পেজ → সেটিংস → মেনু → আগের স্ক্রিন
• সেটিংসে মেনুতে ফেরার «‹ মেনু» বোতাম
• ১.২০.০-এর সবকিছু অন্তর্ভুক্ত: একই হেডার ও ট্যাব, পূর্ণ স্ক্রিন সেটিংস, ১৩ ভাষায় কাহিনি, তাৎক্ষণিক সংশোধন
</bn-BD>

<sq>
• Butoni dhe gjesti Prapa i Android-it tani kthehen një nivel: nënfaqe → Cilësimet → Menyja → ekrani i mëparshëm
• Butoni «‹ Menyja» te Cilësimet
• Përfshin gjithçka nga 1.20.0: kokë dhe skeda të njëjta, cilësime në ekran të plotë, tregime në 13 gjuhë, korrigjim i menjëhershëm
</sq>
```

Bosnisch (Website / Social Media):

```
• Android dugme i pokret Nazad sada vraćaju jedan nivo: podstranica → Postavke → Meni → prethodni ekran
• Dugme «‹ Meni» u Postavkama
• Uključuje sve iz 1.20.0: isto zaglavlje i kartice, postavke preko cijelog ekrana, priče na 13 jezika, trenutna ispravka
```
