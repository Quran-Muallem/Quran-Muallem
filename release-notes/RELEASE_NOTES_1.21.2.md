# Quran Muallem 1.21.2 – Release Notes (versionCode 57)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Ursache des schwarzen Mushaf-Bildschirms gefunden (dank der Fehlerkarte aus 1.21.1): React-Fehler #185 «Maximum update depth exceeded».
- `MushafReader.fit()` lief nach jedem Rendern und maß die Seitenoberkante relativ zum Bildlauf; bei großer Schrift und hoher Android-Navigationsleiste passte die Seite nicht, der Bildlauf änderte sich mit jeder neuen Höhe → Endlosschleife. Jetzt: Messung relativ zum Dokument, Schwingungsbremse (nach 6 Änderungen in 600 ms gilt der kleinste Wert für 1,5 s), Leistenhöhe gerundet.
- `MushafPage`: setzt Schriftgröße/Stauchung nur noch bei echten Änderungen.
- Mit der alten APK nachgestellt (Schrift 1,3×, untere Leiste +40 px → Fehler #185) und mit der neuen Version bestätigt behoben.

```
<en-US>
• Fixed: on some phones (large text, tall navigation bar) opening the Mushaf crashed
• Includes everything from 1.21.1
</en-US>

<de-DE>
• Behoben: Auf manchen Handys (große Schrift, hohe Navigationsleiste) stürzte der Mushaf beim Öffnen ab
• Enthält alles aus 1.21.1
</de-DE>

<ar>
• إصلاح: على بعض الهواتف (خط كبير، شريط تنقل مرتفع) كان المصحف يتعطل عند فتحه
• يتضمن كل ما في 1.21.1
</ar>

<fr-FR>
• Corrigé : sur certains téléphones (grand texte, barre de navigation haute) le Mushaf plantait à l'ouverture
• Inclut tout de la 1.21.1
</fr-FR>

<tr-TR>
• Düzeltildi: bazı telefonlarda (büyük yazı, yüksek gezinme çubuğu) Mushaf açılırken çöküyordu
• 1.21.1'in tamamını içerir
</tr-TR>

<ur>
• درست: کچھ فونز پر (بڑا فونٹ، اونچی نیویگیشن بار) مصحف کھولتے ہی بند ہو جاتا تھا
• 1.21.1 کی سب چیزیں شامل
</ur>

<id>
• Diperbaiki: di beberapa ponsel (teks besar, bilah navigasi tinggi) Mushaf mogok saat dibuka
• Termasuk semua dari 1.21.1
</id>

<ms>
• Dibaiki: pada sesetengah telefon (teks besar, bar navigasi tinggi) Mushaf ranap semasa dibuka
• Termasuk semua dari 1.21.1
</ms>

<es-ES>
• Corregido: en algunos móviles (texto grande, barra de navegación alta) el Mushaf fallaba al abrirse
• Incluye todo lo de 1.21.1
</es-ES>

<ru-RU>
• Исправлено: на некоторых телефонах (крупный шрифт, высокая панель навигации) Мусхаф падал при открытии
• Включает всё из 1.21.1
</ru-RU>

<bn-BD>
• ঠিক করা হয়েছে: কিছু ফোনে (বড় লেখা, উঁচু নেভিগেশন বার) মুসহাফ খুলতেই বন্ধ হয়ে যেত
• ১.২১.১-এর সবকিছু অন্তর্ভুক্ত
</bn-BD>

<sq>
• U rregullua: në disa telefona (tekst i madh, shirit navigimi i lartë) Mushafi rrëzohej kur hapej
• Përfshin gjithçka nga 1.21.1
</sq>
```

Bosnisch (Website / Social Media):

```
• Popravljeno: na nekim telefonima (veliki tekst, visoka navigaciona traka) Mushaf se rušio pri otvaranju
• Uključuje sve iz 1.21.1
```
