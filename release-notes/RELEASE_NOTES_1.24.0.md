# Quran Muallem 1.24.0 – Release Notes (versionCode 64)

Play Console → Release → „Versionshinweise“ (je Sprache max. 500 Zeichen). Block komplett einfügen.

**Hinweise:**
- Native Zurück-Navigation: `src/lib/useNavigationHistory.ts` (Bildschirm-Verlauf, Leser-Scrollposition, `@capacitor/app` backButton mit Doppeldruck-Beenden, iOS-Randwischen) auf Basis von `backStack.ts`.
- Eigene Startseite: `src/lib/homeLayoutStore.ts` (localStorage `qm_custom_home_tiles`), Bearbeitungsmodus in `HomeActionCards.tsx`, 📌-Knöpfe im Burger-Menü (`MushafMenu.tsx`), neue Menüeinträge «رحلة الأنبياء» und «تذكير الورد».
- Neue Abhängigkeit: `@capacitor/app` ^8.1.2 (keine Berechtigungen).
- Datenschutzerklärung: Startseiten-Anordnung in der Liste der lokal gespeicherten Daten ergänzt (Stand 18.11.2026, Version 1.24), App- und Web-Fassung neu erzeugt. Keine neuen Server, keine neuen Berechtigungen.

```
<en-US>
New in Quran Muallem 1.24:
• Your own Home screen: tap ✏️ Customize Home (or long-press a tile) to reorder with ⠿ or ↑ ↓, remove with ✕, and add more with + Add from Menu.
• Tap 📌 next to any item in the menu to pin it to your Home.
• Smoother back button: it closes what is open, then steps back through the screens you visited – each at the place you left it. Readers return to the same spot in the list.
• At Home, press back twice to exit.
</en-US>

<de-DE>
Neu in Quran Muallem 1.24:
• Deine eigene Startseite: ✏️ Startseite anpassen (oder lange auf eine Kachel drücken) – mit ⠿ oder ↑ ↓ sortieren, mit ✕ entfernen, mit + Aus dem Menü hinzufügen ergänzen.
• 📌 neben jedem Menüeintrag heftet ihn an die Startseite.
• Zurück-Taste: schließt erst, was offen ist, dann geht es durch die besuchten Bildschirme zurück – jeweils an die Stelle, wo du warst.
• Auf der Startseite zweimal zurück zum Beenden.
</de-DE>

<ar>
جديد في معلم القرآن 1.24:
• رئيسية على ذوقك: اضغط ✏️ تخصيص الرئيسية (أو اضغط مطوّلًا على أي قسم)، رتّب بالسحب ⠿ أو بالأسهم ↑ ↓، وأزل بـ ✕، وأضف المزيد بـ + إضافة من القائمة.
• اضغط 📌 بجانب أي قسم في القائمة لتثبيته في الرئيسية.
• زر الرجوع أذكى: يغلق المفتوح أولًا، ثم يعود بك عبر الشاشات التي زرتها، كلٌّ في الموضع الذي تركته؛ والقصص والأحاديث تعود إلى المكان نفسه في القائمة.
• في الرئيسية: اضغط رجوع مرتين للخروج.
</ar>

<fr-FR>
Nouveau dans Quran Muallem 1.24 :
• Votre propre accueil : ✏️ Personnaliser l'accueil (ou appui long sur une tuile) – réorganisez avec ⠿ ou ↑ ↓, retirez avec ✕, ajoutez avec + Ajouter depuis le menu.
• Touchez 📌 à côté d'un élément du menu pour l'épingler à l'accueil.
• Bouton Retour amélioré : il ferme d'abord ce qui est ouvert, puis revient sur les écrans visités, à l'endroit où vous étiez.
• À l'accueil, appuyez deux fois sur Retour pour quitter.
</fr-FR>

<tr-TR>
Quran Muallem 1.24'te yeni:
• Kendi ana sayfanız: ✏️ Ana sayfayı düzenle'ye dokunun (veya bir kutuya uzun basın) – ⠿ ya da ↑ ↓ ile sıralayın, ✕ ile kaldırın, + Menüden ekle ile ekleyin.
• Menüdeki herhangi bir öğenin yanındaki 📌 onu ana sayfaya sabitler.
• Daha akıllı geri tuşu: önce açık olanı kapatır, sonra ziyaret ettiğiniz ekranlara kaldığınız yerden geri döner.
• Ana sayfada çıkmak için iki kez geri basın.
</tr-TR>

<ur>
معلم القرآن 1.24 میں نیا:
• اپنا ہوم: ✏️ ہوم ترتیب دیں (یا کسی خانے کو دیر تک دبائیں) – ⠿ یا ↑ ↓ سے ترتیب بدلیں، ✕ سے ہٹائیں، + مینو سے شامل کریں۔
• مینو میں کسی بھی حصے کے ساتھ 📌 دبا کر اسے ہوم پر لگائیں۔
• بہتر واپسی بٹن: پہلے کھلی چیز بند کرتا ہے، پھر دیکھی ہوئی اسکرینوں پر اسی جگہ واپس لے جاتا ہے۔
• ہوم پر باہر نکلنے کے لیے دو بار واپس دبائیں۔
</ur>

<id>
Baru di Quran Muallem 1.24:
• Beranda milik Anda: ketuk ✏️ Atur Beranda (atau tekan lama sebuah kotak) – urutkan dengan ⠿ atau ↑ ↓, hapus dengan ✕, tambah lewat + Tambah dari Menu.
• Ketuk 📌 di samping item menu untuk menyematkannya ke Beranda.
• Tombol kembali lebih cerdas: menutup yang terbuka, lalu kembali ke layar yang Anda kunjungi, di posisi terakhir.
• Di Beranda, tekan kembali dua kali untuk keluar.
</id>

<ms>
Baharu dalam Quran Muallem 1.24:
• Laman Utama anda sendiri: ketik ✏️ Ubah suai Laman Utama (atau tekan lama jubin) – susun dengan ⠿ atau ↑ ↓, buang dengan ✕, tambah melalui + Tambah dari Menu.
• Ketik 📌 di sebelah item menu untuk menyematnya ke Laman Utama.
• Butang kembali lebih pintar: menutup yang terbuka, kemudian kembali ke skrin yang dilawati, di tempat yang sama.
• Di Laman Utama, tekan kembali dua kali untuk keluar.
</ms>

<es-ES>
Novedades de Quran Muallem 1.24:
• Tu propio inicio: toca ✏️ Personalizar inicio (o mantén pulsada una tarjeta) – ordena con ⠿ o ↑ ↓, quita con ✕ y añade con + Añadir desde el menú.
• Toca 📌 junto a cualquier elemento del menú para fijarlo en inicio.
• Botón atrás más inteligente: cierra lo abierto y luego vuelve por las pantallas visitadas, al mismo lugar.
• En inicio, pulsa atrás dos veces para salir.
</es-ES>

<ru-RU>
Новое в Quran Muallem 1.24:
• Своя главная: нажмите ✏️ Настроить главную (или удерживайте плитку) – меняйте порядок ⠿ или ↑ ↓, убирайте ✕, добавляйте через + Добавить из меню.
• Нажмите 📌 рядом с пунктом меню, чтобы закрепить его на главной.
• Умная кнопка «Назад»: сначала закрывает открытое, затем возвращает по посещённым экранам на то же место.
• На главной нажмите «Назад» дважды для выхода.
</ru-RU>

<bn-BD>
কুরআন মুয়াল্লিম 1.24-এ নতুন:
• নিজের মতো হোম: ✏️ হোম সাজান চাপুন (বা কোনো টাইল চেপে ধরুন) – ⠿ বা ↑ ↓ দিয়ে সাজান, ✕ দিয়ে সরান, + মেনু থেকে যোগ করুন।
• মেনুর যেকোনো আইটেমের পাশে 📌 চাপলে তা হোমে যুক্ত হবে।
• উন্নত ব্যাক বোতাম: আগে খোলা জিনিস বন্ধ করে, তারপর দেখা স্ক্রিনগুলোতে একই জায়গায় ফিরিয়ে নেয়।
• হোমে বের হতে দুবার ব্যাক চাপুন।
</bn-BD>

<sq>
E re në Quran Muallem 1.24:
• Faqja jote kryesore: prek ✏️ Përshtat faqen kryesore (ose mbaj shtypur një pllakë) – rendit me ⠿ ose ↑ ↓, hiq me ✕, shto me + Shto nga menyja.
• Prek 📌 pranë çdo elementi të menysë për ta fiksuar në faqen kryesore.
• Butoni prapa më i zgjuar: mbyll fillimisht atë që është hapur, pastaj të kthen te ekranet e vizituara, në të njëjtin vend.
• Në faqen kryesore, shtyp prapa dy herë për të dalë.
</sq>
```

Bosnisch (Website / Social Media):

```
Novo u Quran Muallem 1.24:
• Vaša početna stranica: dodirnite ✏️ Prilagodi početnu (ili dugo pritisnite pločicu) – redoslijed sa ⠿ ili ↑ ↓, uklanjanje sa ✕, dodavanje sa + Dodaj iz menija.
• Dodirnite 📌 pored bilo koje stavke menija da je zakačite na početnu.
• Pametnije dugme nazad: prvo zatvara otvoreno, zatim vraća kroz posjećene ekrane na isto mjesto.
• Na početnoj pritisnite nazad dvaput za izlaz.
```
