# Quran Muallem 1.21.1 – Release Notes (versionCode 56)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Hotfix: Auf einem Gerät wurde der Bildschirm beim Öffnen des Mushaf schwarz (React entfernt bei einem unbehandelten Render-Fehler die ganze Oberfläche; die Capacitor-App hatte keine Fehlergrenze). Im Browser nicht reproduzierbar.
- Neu `src/components/CrashBoundary.tsx`: Fehlergrenze pro Tab (Kopfzeile und Leiste bleiben, Karte mit «Erneut versuchen» / «Zur Startseite» und aufklappbaren Details) plus Wurzel-Fehlergrenze in `app-main.tsx`. Fehler werden in `localStorage["qm.lastCrash"]` gespeichert.
- Ursache noch offen: Bitte bei erneutem Auftreten einen Screenshot der «Details» senden.

```
<en-US>
• No more black screen: if a screen runs into a problem, the header and tab bar stay and you get «Try again» / «Go home»
• Includes everything from 1.21.0
</en-US>

<de-DE>
• Kein schwarzer Bildschirm mehr: Hat ein Bereich ein Problem, bleiben Kopfzeile und Leiste, und du bekommst «Erneut versuchen» / «Zur Startseite»
• Enthält alles aus 1.21.0
</de-DE>

<ar>
• لا شاشة سوداء بعد اليوم: إذا واجهت شاشة مشكلة يبقى الشريط العلوي والسفلي وتظهر «حاول مرة أخرى» / «إلى الرئيسية»
• يتضمن كل ما في 1.21.0
</ar>

<fr-FR>
• Fini l'écran noir : si un écran rencontre un problème, l'en-tête et les onglets restent, avec «Réessayer» / «Accueil»
• Inclut tout de la 1.21.0
</fr-FR>

<tr-TR>
• Artık siyah ekran yok: bir ekranda sorun olursa üst çubuk ve sekmeler kalır, «Tekrar dene» / «Ana sayfa» çıkar
• 1.21.0'ın tamamını içerir
</tr-TR>

<ur>
• اب کالی اسکرین نہیں: کسی اسکرین میں مسئلہ ہو تو اوپر اور نیچے کی پٹیاں رہتی ہیں اور «دوبارہ کوشش» / «ہوم» ملتا ہے
• 1.21.0 کی سب چیزیں شامل
</ur>

<id>
• Tidak ada layar hitam lagi: jika layar bermasalah, header dan tab tetap ada dengan «Coba lagi» / «Ke beranda»
• Termasuk semua dari 1.21.0
</id>

<ms>
• Tiada lagi skrin hitam: jika skrin bermasalah, pengepala dan tab kekal dengan «Cuba lagi» / «Ke utama»
• Termasuk semua dari 1.21.0
</ms>

<es-ES>
• Se acabó la pantalla negra: si una pantalla falla, la cabecera y las pestañas siguen ahí con «Reintentar» / «Ir al inicio»
• Incluye todo lo de 1.21.0
</es-ES>

<ru-RU>
• Больше никакого чёрного экрана: при ошибке экрана шапка и вкладки остаются, появляются «Повторить» / «На главную»
• Включает всё из 1.21.0
</ru-RU>

<bn-BD>
• আর কালো স্ক্রিন নয়: কোনো স্ক্রিনে সমস্যা হলে হেডার ও ট্যাব থাকে, সঙ্গে «আবার চেষ্টা করো» / «হোমে যাও»
• ১.২১.০-এর সবকিছু অন্তর্ভুক্ত
</bn-BD>

<sq>
• Më nuk ka ekran të zi: nëse një ekran ka problem, koka dhe skedat mbeten me «Provo përsëri» / «Te kreu»
• Përfshin gjithçka nga 1.21.0
</sq>
```

Bosnisch (Website / Social Media):

```
• Nema više crnog ekrana: ako ekran ima problem, zaglavlje i kartice ostaju uz «Pokušaj ponovo» / «Na početnu»
• Uključuje sve iz 1.21.0
```
