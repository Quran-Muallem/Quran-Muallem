/**
 * Offline Tajweed guide: the main rules of recitation for the riwāyah of Ḥafṣ ʿan ʿĀṣim (ṭarīq
 * ash-Shāṭibiyyah), following the classical primers Tuḥfat al-Aṭfāl and al-Muqaddimah al-Jazariyyah.
 * Static, bundled with the app — no network, no AI.
 *
 * `mark` lists exact substrings of an example that show the rule (highlighted in the UI);
 * a test checks that each mark occurs in its example.
 */

export type TajweedExample = { ar: string; mark?: string[]; noteAr?: string; noteEn?: string };

export type TajweedRule = {
  id: string;
  titleAr: string;
  titleEn: string;
  /** The letters the rule applies to, if any. */
  letters?: string;
  summaryAr: string;
  summaryEn: string;
  pointsAr?: string[];
  pointsEn?: string[];
  examples: TajweedExample[];
  /** Extra search words (transliterations, synonyms). */
  keywords?: string[];
};

export type TajweedCategory = {
  id: "noon" | "meem" | "madd" | "makharij" | "qalqalah" | "tafkheem";
  titleAr: string;
  titleEn: string;
  introAr: string;
  introEn: string;
  rules: TajweedRule[];
};

export const TAJWEED: TajweedCategory[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "noon",
    titleAr: "أحكام النون الساكنة والتنوين",
    titleEn: "Nūn sākinah & Tanwīn",
    introAr: "للنون الساكنة والتنوين أربعة أحكام بحسب الحرف الذي يليها: الإظهار، والإدغام، والإقلاب، والإخفاء. والتنوين نون ساكنة زائدة تُلفظ ولا تُكتب.",
    introEn: "A nūn with sukūn and tanwīn (which sounds like a nūn sākinah) follow four rules, depending on the next letter: iẓhār, idghām, iqlāb and ikhfāʾ.",
    rules: [
      {
        id: "izhar-halqi",
        titleAr: "الإظهار الحلقي",
        titleEn: "Iẓhār ḥalqī (clear pronunciation)",
        letters: "ء ه ع ح غ خ",
        summaryAr: "إذا جاء بعد النون الساكنة أو التنوين حرف من حروف الحلق الستة، تُنطق النون واضحة من مخرجها دون غنة زائدة.",
        summaryEn: "Before one of the six throat letters, the nūn is pronounced clearly from its own point of articulation, without extra nasal sound.",
        pointsAr: ["حروفه مجموعة في أوائل كلمات: «أخي هاك علمًا حازه غير خاسر».", "يكون في كلمة وفي كلمتين، ومع التنوين لا يكون إلا في كلمتين."],
        pointsEn: ["Letters: hamzah, hāʾ, ʿayn, ḥāʾ, ghayn, khāʾ.", "Occurs within one word or across two words; with tanwīn always across two words."],
        examples: [
          { ar: "مَنْ آمَنَ", mark: ["نْ آ"] },
          { ar: "مِنْ هَادٍ", mark: ["نْ هَ"] },
          { ar: "يَنْأَوْنَ", mark: ["نْأَ"] },
          { ar: "عَذَابٌ أَلِيمٌ", mark: ["ٌ أَ"] },
        ],
        keywords: ["izhar", "idhar", "halqi", "throat", "اظهار"],
      },
      {
        id: "idgham-ghunnah",
        titleAr: "الإدغام بغنة",
        titleEn: "Idghām with ghunnah",
        letters: "ي ن م و",
        summaryAr: "إذا جاء بعد النون الساكنة أو التنوين في كلمتين أحد حروف «ينمو»، تُدغم النون فيه مع غنة بمقدار حركتين.",
        summaryEn: "Across two words, before yāʾ, nūn, mīm or wāw («ينمو»), the nūn merges into the next letter with a nasal sound of two counts.",
        pointsAr: ["يكون في كلمتين فقط.", "إذا اجتمعت النون الساكنة مع الياء أو الواو في كلمة واحدة وجب الإظهار (الإظهار المطلق): دُنْيَا، بُنْيَانٌ، صِنْوَانٌ، قِنْوَانٌ."],
        pointsEn: ["Only across two words.", "Within one word, nūn before yāʾ or wāw stays clear (iẓhār muṭlaq): dunyā, bunyān, ṣinwān, qinwān."],
        examples: [
          { ar: "مَنْ يَقُولُ", mark: ["نْ يَ"] },
          { ar: "مِنْ نِعْمَةٍ", mark: ["نْ نِ"] },
          { ar: "مِنْ مَالٍ", mark: ["نْ مَ"] },
          { ar: "مِنْ وَالٍ", mark: ["نْ وَ"] },
          { ar: "الدُّنْيَا", mark: ["نْيَ"], noteAr: "إظهار مطلق (كلمة واحدة)", noteEn: "Iẓhār muṭlaq (one word)" },
        ],
        keywords: ["idgham", "idghaam", "merge", "ghunna", "yanmu", "ادغام", "غنه"],
      },
      {
        id: "idgham-no-ghunnah",
        titleAr: "الإدغام بغير غنة",
        titleEn: "Idghām without ghunnah",
        letters: "ل ر",
        summaryAr: "إذا جاء بعد النون الساكنة أو التنوين لام أو راء، تُدغم النون فيهما إدغامًا كاملًا بلا غنة.",
        summaryEn: "Before lām or rāʾ the nūn merges completely into the next letter, without any nasal sound.",
        pointsAr: ["يكون في كلمتين.", "يُستثنى لحفص: ﴿مَنْ رَاقٍ﴾ في سورة القيامة؛ فيها سكت لطيف على النون فلا إدغام."],
        pointsEn: ["Across two words.", "Exception for Ḥafṣ: «man rāq» (al-Qiyāmah) — a short pause (sakt) on the nūn, so no idghām."],
        examples: [
          { ar: "مِنْ لَدُنْهُ", mark: ["نْ لَ"] },
          { ar: "مِنْ رَبِّهِمْ", mark: ["نْ رَ"] },
          { ar: "غَفُورٌ رَحِيمٌ", mark: ["ٌ رَ"] },
        ],
        keywords: ["idgham", "without ghunna", "lam", "ra", "ادغام"],
      },
      {
        id: "iqlab",
        titleAr: "الإقلاب",
        titleEn: "Iqlāb (conversion)",
        letters: "ب",
        summaryAr: "إذا جاء بعد النون الساكنة أو التنوين باء، تُقلب النون ميمًا مخفاة مع غنة بمقدار حركتين.",
        summaryEn: "Before bāʾ the nūn turns into a hidden mīm, with a nasal sound of two counts.",
        pointsAr: ["علامته في المصحف ميم صغيرة فوق النون أو بدل الحركة الثانية من التنوين.", "يكون في كلمة وفي كلمتين."],
        pointsEn: ["Marked in the Mushaf with a small mīm.", "Within one word or across two words."],
        examples: [
          { ar: "مِنْ بَعْدِ", mark: ["نْ بَ"] },
          { ar: "أَنْبِئْهُمْ", mark: ["نْبِ"] },
          { ar: "سَمِيعٌ بَصِيرٌ", mark: ["ٌ بَ"] },
        ],
        keywords: ["iqlab", "iqlaab", "convert", "meem", "اقلاب"],
      },
      {
        id: "ikhfa-haqiqi",
        titleAr: "الإخفاء الحقيقي",
        titleEn: "Ikhfāʾ ḥaqīqī (hiding)",
        letters: "ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ",
        summaryAr: "قبل الحروف الخمسة عشر الباقية تُنطق النون بين الإظهار والإدغام، خالية من التشديد مع غنة بمقدار حركتين.",
        summaryEn: "Before the remaining fifteen letters the nūn is pronounced between clear and merged — no shaddah, with a nasal sound of two counts.",
        pointsAr: ["حروفه في أوائل كلمات البيت: «صِفْ ذا ثنا كم جاد شخص قد سما، دُمْ طيبًا زِدْ في تقى ضَعْ ظالمًا».", "يكون في كلمة وفي كلمتين.", "تُهيَّأ اللسان لمخرج الحرف التالي، وتتبع الغنة الحرف الذي بعدها تفخيمًا وترقيقًا."],
        pointsEn: ["Fifteen letters: ṣ dh th k j sh q s d ṭ z f t ḍ ẓ.", "Within one word or across two words.", "The tongue prepares for the next letter; the nasal sound is heavy or light like that letter."],
        examples: [
          { ar: "أَنْتُمْ", mark: ["نْتُ"] },
          { ar: "مِنْ تَحْتِهَا", mark: ["نْ تَ"] },
          { ar: "يُنْفِقُونَ", mark: ["نْفِ"] },
          { ar: "رِيحًا صَرْصَرًا", mark: ["ًا صَ"] },
        ],
        keywords: ["ikhfa", "ikhfaa", "hide", "اخفاء"],
      },
      {
        id: "ghunnah-mushaddad",
        titleAr: "النون والميم المشددتان",
        titleEn: "Nūn & mīm with shaddah",
        letters: "نّ مّ",
        summaryAr: "كل نون أو ميم مشددة تُنطق مع غنة كاملة بمقدار حركتين، وتُسمّى حرف غنة مشدد.",
        summaryEn: "Every nūn or mīm with shaddah is pronounced with a full nasal sound of two counts.",
        examples: [
          { ar: "إِنَّ", mark: ["نَّ"] },
          { ar: "ثُمَّ", mark: ["مَّ"] },
          { ar: "النَّاسِ", mark: ["نَّ"] },
        ],
        keywords: ["ghunnah", "ghunna", "shadda", "mushaddad", "غنه", "مشدد"],
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: "meem",
    titleAr: "أحكام الميم الساكنة",
    titleEn: "Mīm sākinah",
    introAr: "للميم الساكنة ثلاثة أحكام: الإخفاء الشفوي، والإدغام الشفوي (المتماثلين الصغير)، والإظهار الشفوي.",
    introEn: "A mīm with sukūn follows three rules: labial hiding, labial merging and labial clear pronunciation.",
    rules: [
      {
        id: "ikhfa-shafawi",
        titleAr: "الإخفاء الشفوي",
        titleEn: "Ikhfāʾ shafawī (labial hiding)",
        letters: "ب",
        summaryAr: "إذا جاء بعد الميم الساكنة باء، تُخفى الميم مع غنة بمقدار حركتين.",
        summaryEn: "Before bāʾ the mīm is hidden, with a nasal sound of two counts.",
        pointsAr: ["لا يكون إلا في كلمتين.", "سُمّي شفويًا لخروج الميم والباء من الشفتين."],
        pointsEn: ["Only across two words.", "“Labial” because mīm and bāʾ come from the lips."],
        examples: [
          { ar: "تَرْمِيهِمْ بِحِجَارَةٍ", mark: ["مْ بِ"] },
          { ar: "وَهُمْ بِالْآخِرَةِ", mark: ["مْ بِ"] },
        ],
        keywords: ["ikhfa shafawi", "labial", "اخفاء شفوي"],
      },
      {
        id: "idgham-shafawi",
        titleAr: "الإدغام الشفوي",
        titleEn: "Idghām shafawī (labial merging)",
        letters: "م",
        summaryAr: "إذا جاء بعد الميم الساكنة ميم، تُدغم الأولى في الثانية فتصيران ميمًا مشددة مع غنة بمقدار حركتين.",
        summaryEn: "Before another mīm the two merge into one mīm with shaddah, with a nasal sound of two counts.",
        pointsAr: ["ويُسمّى أيضًا: إدغام المتماثلين الصغير."],
        pointsEn: ["Also called “small idghām of identical letters”."],
        examples: [
          { ar: "لَهُمْ مَا", mark: ["مْ مَ"] },
          { ar: "كَمْ مِنْ فِئَةٍ", mark: ["مْ مِ"] },
        ],
        keywords: ["idgham shafawi", "mithlayn", "ادغام شفوي"],
      },
      {
        id: "izhar-shafawi",
        titleAr: "الإظهار الشفوي",
        titleEn: "Iẓhār shafawī (labial clear)",
        letters: "بقية الحروف",
        summaryAr: "قبل بقية الحروف (غير الباء والميم) تُنطق الميم الساكنة واضحة من غير غنة زائدة.",
        summaryEn: "Before all other letters the mīm is pronounced clearly, without extra nasal sound.",
        pointsAr: ["يُعتنى بإظهارها أشدّ عند الواو والفاء، لقرب مخرجهما منها واتحاد مخرج الواو معها."],
        pointsEn: ["Take special care before wāw and fāʾ, which are close to the mīm and easily merged by mistake."],
        examples: [
          { ar: "لَهُمْ فِيهَا", mark: ["مْ فِ"] },
          { ar: "أَمْ تَأْمُرُهُمْ", mark: ["مْ تَ"] },
          { ar: "عَلَيْهِمْ وَلَا", mark: ["مْ وَ"] },
        ],
        keywords: ["izhar shafawi", "labial", "اظهار شفوي"],
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: "madd",
    titleAr: "أحكام المدود",
    titleEn: "Madd (lengthening)",
    introAr: "حروف المد ثلاثة: الألف الساكنة المفتوح ما قبلها، والواو الساكنة المضموم ما قبلها، والياء الساكنة المكسور ما قبلها. والمد قسمان: أصلي (طبيعي) وفرعي بسبب همز أو سكون. وتُقاس المدود بالحركات.",
    introEn: "The madd letters are alif after fatḥah, wāw sākinah after ḍammah and yāʾ sākinah after kasrah. Madd is either original (natural) or secondary, caused by a hamzah or a sukūn. Lengths are counted in ḥarakāt (beats).",
    rules: [
      {
        id: "madd-tabii",
        titleAr: "المد الطبيعي (الأصلي)",
        titleEn: "Madd ṭabīʿī (natural)",
        letters: "ا و ي",
        summaryAr: "حرف مد ليس بعده همز ولا سكون، يُمد حركتين فقط.",
        summaryEn: "A madd letter not followed by hamzah or sukūn: exactly two counts.",
        examples: [
          { ar: "قَالَ", mark: ["قَا"] },
          { ar: "يَقُولُ", mark: ["قُو"] },
          { ar: "قِيلَ", mark: ["قِي"] },
        ],
        keywords: ["madd tabii", "natural", "asli", "two counts", "مد طبيعي", "اصلي"],
      },
      {
        id: "madd-muttasil",
        titleAr: "المد المتصل (الواجب)",
        titleEn: "Madd muttaṣil (connected)",
        summaryAr: "حرف مد بعده همز في الكلمة نفسها، يُمد أربع أو خمس حركات وجوبًا.",
        summaryEn: "A madd letter followed by hamzah in the same word: 4 or 5 counts (obligatory).",
        pointsAr: ["إذا وُقف على همزة متطرفة جاز المد ست حركات أيضًا."],
        pointsEn: ["When stopping on a final hamzah, 6 counts are also allowed."],
        examples: [
          { ar: "جَاءَ", mark: ["جَاءَ"] },
          { ar: "السَّمَاءِ", mark: ["مَاءِ"] },
          { ar: "سُوءَ", mark: ["سُوءَ"] },
        ],
        keywords: ["madd muttasil", "wajib", "obligatory", "connected", "مد متصل", "واجب"],
      },
      {
        id: "madd-munfasil",
        titleAr: "المد المنفصل (الجائز)",
        titleEn: "Madd munfaṣil (separated)",
        summaryAr: "حرف مد في آخر كلمة والهمز في أول الكلمة التالية، يُمد لحفص من طريق الشاطبية أربعًا أو خمسًا، ويجوز القصر حركتين من طرق أخرى.",
        summaryEn: "A madd letter at the end of a word and hamzah at the start of the next: 4 or 5 counts for Ḥafṣ (ash-Shāṭibiyyah); 2 counts by other routes.",
        examples: [
          { ar: "بِمَا أُنْزِلَ", mark: ["مَا أُ"] },
          { ar: "يَا أَيُّهَا", mark: ["يَا أَ"] },
          { ar: "قُوا أَنْفُسَكُمْ", mark: ["قُوا أَ"] },
        ],
        keywords: ["madd munfasil", "jaiz", "separated", "مد منفصل", "جائز"],
      },
      {
        id: "madd-lazim",
        titleAr: "المد اللازم",
        titleEn: "Madd lāzim (necessary)",
        summaryAr: "حرف مد بعده سكون أصلي ثابت وصلًا ووقفًا، يُمد ست حركات لزومًا.",
        summaryEn: "A madd letter followed by an original sukūn (in reading on and stopping): 6 counts.",
        pointsAr: [
          "كلمي مثقل: بعد حرف المد حرف مشدد في كلمة، مثل: الضَّالِّينَ، الْحَاقَّةُ.",
          "كلمي مخفف: بعده سكون بلا تشديد، في موضعي ﴿آلْآنَ﴾ بيونس.",
          "حرفي: في الحروف المقطعة التي هجاؤها ثلاثة أحرف أوسطها حرف مد، مثل: الم، ق، ن (عدا الألف).",
        ],
        pointsEn: [
          "In a word with shaddah: aḍ-ḍāllīn, al-ḥāqqah.",
          "In a word without shaddah: ālʾān (two places in Yūnus).",
          "In the opening letters of surahs spelled with three letters and a madd in the middle: Alif-Lām-Mīm, Qāf, Nūn.",
        ],
        examples: [
          { ar: "الضَّالِّينَ", mark: ["ضَّالِّ"] },
          { ar: "الْحَاقَّةُ", mark: ["حَاقَّ"] },
          { ar: "الم", noteAr: "تُقرأ: ألِف لامْ ميمْ — اللام والميم ست حركات", noteEn: "Read alif-lāāām-mīīīm: lām and mīm 6 counts" },
        ],
        keywords: ["madd lazim", "necessary", "six", "مد لازم", "مثقل", "مخفف", "حرفي"],
      },
      {
        id: "madd-arid",
        titleAr: "المد العارض للسكون",
        titleEn: "Madd ʿāriḍ lis-sukūn",
        summaryAr: "حرف مد بعده حرف سُكّن لأجل الوقف، يجوز فيه القصر (٢) والتوسط (٤) والإشباع (٦).",
        summaryEn: "A madd letter before a letter made silent by stopping: 2, 4 or 6 counts.",
        pointsAr: ["إذا وُصلت الكلمة بما بعدها رجع مدًّا طبيعيًا."],
        pointsEn: ["When reading on without stopping it is a natural madd again."],
        examples: [
          { ar: "الرَّحِيمِ", mark: ["حِيمِ"], noteAr: "عند الوقف: الرَّحِيمْ", noteEn: "When stopping: ar-raḥīm" },
          { ar: "نَسْتَعِينُ", mark: ["عِينُ"], noteAr: "عند الوقف", noteEn: "When stopping" },
        ],
        keywords: ["madd arid", "aarid", "stopping", "waqf", "مد عارض"],
      },
      {
        id: "madd-leen",
        titleAr: "مد اللين",
        titleEn: "Madd līn (soft)",
        letters: "وْ يْ",
        summaryAr: "واو أو ياء ساكنة مفتوح ما قبلها، بعدها حرف سُكّن للوقف، يجوز فيها ٢ أو ٤ أو ٦ حركات، ولا مد فيها عند الوصل.",
        summaryEn: "Wāw or yāʾ sākinah after fatḥah, before a letter silenced by stopping: 2, 4 or 6 counts; no lengthening when reading on.",
        examples: [
          { ar: "خَوْفٍ", mark: ["خَوْ"], noteAr: "عند الوقف: خَوْفْ", noteEn: "When stopping: khawf" },
          { ar: "الْبَيْتِ", mark: ["بَيْ"], noteAr: "عند الوقف", noteEn: "When stopping" },
        ],
        keywords: ["madd leen", "lin", "soft", "مد لين"],
      },
      {
        id: "madd-badal",
        titleAr: "مد البدل",
        titleEn: "Madd badal (substitute)",
        summaryAr: "همز بعده حرف مد في كلمة واحدة، يُمد لحفص حركتين.",
        summaryEn: "A hamzah followed by a madd letter in the same word: 2 counts for Ḥafṣ.",
        examples: [
          { ar: "آمَنُوا", mark: ["آ"] },
          { ar: "إِيمَانًا", mark: ["إِي"] },
          { ar: "أُوتُوا", mark: ["أُو"] },
        ],
        keywords: ["madd badal", "مد بدل"],
      },
      {
        id: "madd-iwad",
        titleAr: "مد العوض",
        titleEn: "Madd ʿiwaḍ (compensation)",
        summaryAr: "عند الوقف على تنوين الفتح يُبدل التنوين ألفًا تُمد حركتين، إلا التاء المربوطة فيوقف عليها هاءً ساكنة.",
        summaryEn: "When stopping on tanwīn with fatḥah, it becomes an alif of 2 counts (not on tāʾ marbūṭah, which is read as a silent hāʾ).",
        examples: [
          { ar: "عَلِيمًا حَكِيمًا", mark: ["كِيمًا"], noteAr: "عند الوقف: حَكِيمَا", noteEn: "When stopping: ḥakīmā" },
        ],
        keywords: ["madd iwad", "tanween fath", "مد عوض"],
      },
      {
        id: "madd-silah",
        titleAr: "مد الصلة",
        titleEn: "Madd ṣilah (hāʾ al-kināyah)",
        summaryAr: "هاء الضمير المفردة الواقعة بين متحركين تُوصل بواو أو ياء لفظًا: صغرى حركتان، وكبرى إذا جاء بعدها همز فتُمد أربعًا أو خمسًا.",
        summaryEn: "The pronoun hāʾ between two voweled letters is lengthened with a sounded wāw or yāʾ: 2 counts, or 4–5 counts before a hamzah.",
        pointsAr: ["لا صلة عند الوقف.", "استثناءات حفص مثل ﴿فِيهِ مُهَانًا﴾ بالصلة، و﴿يَرْضَهُ لَكُمْ﴾ بلا صلة."],
        pointsEn: ["No ṣilah when stopping.", "Ḥafṣ has exceptions, e.g. fīhī muhānā (with ṣilah) and yarḍahu lakum (without)."],
        examples: [
          { ar: "إِنَّهُ كَانَ", mark: ["هُ كَ"], noteAr: "صلة صغرى", noteEn: "Short ṣilah (2)" },
          { ar: "مَالَهُ أَخْلَدَهُ", mark: ["هُ أَ"], noteAr: "صلة كبرى", noteEn: "Long ṣilah (4–5)" },
        ],
        keywords: ["silah", "sila", "ha kinaya", "صله"],
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: "makharij",
    titleAr: "مخارج الحروف وصفاتها",
    titleEn: "Articulation points & attributes",
    introAr: "المخرج هو موضع خروج الحرف، والصفة كيفيته عند خروجه. للحروف سبعة عشر مخرجًا (على مذهب ابن الجزري) في خمسة مواضع رئيسة.",
    introEn: "The makhraj is where a letter comes from; its ṣifāt describe how it is produced. Ibn al-Jazarī counts 17 points of articulation in five main areas.",
    rules: [
      {
        id: "makhraj-jawf",
        titleAr: "الجوف",
        titleEn: "Al-jawf (oral cavity)",
        letters: "ا و ي (المدية)",
        summaryAr: "مخرج حروف المد الثلاثة، تنتهي بانتهاء صوت الهواء.",
        summaryEn: "Source of the three madd letters; they end when the breath ends.",
        examples: [{ ar: "نُوحِيهَا", mark: ["نُو", "حِي", "هَا"] }],
        keywords: ["jawf", "cavity", "madd letters", "جوف"],
      },
      {
        id: "makhraj-halq",
        titleAr: "الحلق",
        titleEn: "Al-ḥalq (throat)",
        letters: "ء ه — ع ح — غ خ",
        summaryAr: "ثلاثة مخارج: أقصاه (الهمزة والهاء)، ووسطه (العين والحاء)، وأدناه إلى الفم (الغين والخاء).",
        summaryEn: "Three points: deepest (hamzah, hāʾ), middle (ʿayn, ḥāʾ), nearest the mouth (ghayn, khāʾ).",
        examples: [{ ar: "أَعْطَى", mark: ["أَ", "عْ"] }],
        keywords: ["halq", "throat", "حلق"],
      },
      {
        id: "makhraj-lisan",
        titleAr: "اللسان",
        titleEn: "Al-lisān (tongue)",
        letters: "ق ك ج ش ي ض ل ن ر ط د ت ص س ز ظ ذ ث",
        summaryAr: "فيه عشرة مخارج لثمانية عشر حرفًا، من أقصى اللسان (القاف ثم الكاف) إلى طرفه (الظاء والذال والثاء مع أطراف الثنايا العليا).",
        summaryEn: "Ten points for eighteen letters, from the back of the tongue (qāf, then kāf) to its tip (ẓāʾ, dhāl, thāʾ against the upper front teeth).",
        pointsAr: [
          "الضاد: من إحدى حافتي اللسان أو كلتيهما مع ما يليها من الأضراس العليا.",
          "اللام والنون والراء: من طرف اللسان بتفاصيل متقاربة.",
          "الطاء والدال والتاء: من طرف اللسان مع أصول الثنايا العليا.",
          "الصاد والزاي والسين (حروف الصفير): من طرف اللسان مع ما فوق الثنايا السفلى.",
        ],
        pointsEn: [
          "Ḍād: from one or both sides of the tongue against the upper molars.",
          "Lām, nūn, rāʾ: from the tip of the tongue, at slightly different places.",
          "Ṭāʾ, dāl, tāʾ: tip of the tongue against the roots of the upper front teeth.",
          "Ṣād, zāy, sīn (whistling letters): tip of the tongue near the lower front teeth.",
        ],
        examples: [{ ar: "الضَّالِّينَ", mark: ["ضَّ"] }],
        keywords: ["lisan", "tongue", "dad", "لسان"],
      },
      {
        id: "makhraj-shafatan",
        titleAr: "الشفتان",
        titleEn: "Ash-shafatān (lips)",
        letters: "ف — ب م و",
        summaryAr: "مخرجان: الفاء من باطن الشفة السفلى مع أطراف الثنايا العليا، والباء والميم والواو (غير المدية) من بين الشفتين.",
        summaryEn: "Two points: fāʾ from the inner lower lip with the upper front teeth; bāʾ, mīm and (non-madd) wāw from both lips.",
        examples: [{ ar: "بِمَا", mark: ["بِ", "مَ"] }],
        keywords: ["shafatan", "lips", "شفتان", "شفوي"],
      },
      {
        id: "makhraj-khayshum",
        titleAr: "الخيشوم",
        titleEn: "Al-khayshūm (nasal cavity)",
        summaryAr: "مخرج الغنة، وهي صفة لازمة للنون والميم.",
        summaryEn: "Source of the ghunnah, the nasal sound that belongs to nūn and mīm.",
        examples: [{ ar: "إِنَّ", mark: ["نَّ"] }],
        keywords: ["khayshum", "nasal", "ghunnah", "خيشوم", "غنه"],
      },
      {
        id: "sifat-opposites",
        titleAr: "الصفات التي لها ضد",
        titleEn: "Attributes with opposites",
        summaryAr: "خمس صفات متقابلة، لكل حرف واحدة من كل زوج.",
        summaryEn: "Five pairs of opposite attributes; every letter has one of each pair.",
        pointsAr: [
          "الهمس (جريان النفس) وحروفه «فحثه شخص سكت»، وضده الجهر.",
          "الشدة (انحباس الصوت) وحروفها «أجد قط بكت»، والتوسط «لن عمر»، وضدهما الرخاوة.",
          "الاستعلاء (ارتفاع اللسان) وحروفه «خص ضغط قظ»، وضده الاستفال.",
          "الإطباق وحروفه ص ض ط ظ، وضده الانفتاح.",
          "الإذلاق وحروفه «فر من لب»، وضده الإصمات.",
        ],
        pointsEn: [
          "Hams (breath flows): f ḥ th h sh kh ṣ s k t — opposite: jahr.",
          "Shiddah (sound stops): ʾ j d q ṭ b k t; in between (tawassuṭ): l n ʿ m r — opposite: rakhāwah.",
          "Istiʿlāʾ (tongue rises): kh ṣ ḍ gh ṭ q ẓ — opposite: istifāl.",
          "Iṭbāq (tongue covers the palate): ṣ ḍ ṭ ẓ — opposite: infitāḥ.",
          "Idhlāq (easy, from lips/tip): f r m n l b — opposite: iṣmāt.",
        ],
        examples: [{ ar: "قَطَبَ", mark: ["قَ", "طَ"], noteAr: "حروف شديدة", noteEn: "Letters with shiddah" }],
        keywords: ["sifat", "attributes", "hams", "jahr", "istila", "itbaq", "صفات", "همس", "جهر", "استعلاء"],
      },
      {
        id: "sifat-single",
        titleAr: "الصفات التي لا ضد لها",
        titleEn: "Attributes without opposites",
        summaryAr: "سبع صفات تميّز حروفًا بعينها.",
        summaryEn: "Seven attributes that distinguish particular letters.",
        pointsAr: [
          "الصفير: ص ز س.",
          "القلقلة: «قطب جد».",
          "اللين: الواو والياء الساكنتان المفتوح ما قبلهما.",
          "الانحراف: اللام والراء.",
          "التكرير: الراء (يُتجنّب المبالغة فيه).",
          "التفشي: الشين.",
          "الاستطالة: الضاد.",
        ],
        pointsEn: [
          "Ṣafīr (whistle): ṣ z s.",
          "Qalqalah (echo): q ṭ b j d.",
          "Līn (softness): wāw and yāʾ sākinah after fatḥah.",
          "Inḥirāf (deviation): lām and rāʾ.",
          "Takrīr (repetition): rāʾ — avoid exaggerating it.",
          "Tafashshī (spreading): shīn.",
          "Istiṭālah (extension): ḍād.",
        ],
        examples: [{ ar: "الشَّمْسِ", mark: ["شَّ"], noteAr: "تفشي الشين", noteEn: "Spreading of shīn" }],
        keywords: ["safir", "takrir", "tafashshi", "istitala", "صفير", "تكرير", "تفشي", "استطاله"],
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: "qalqalah",
    titleAr: "أحكام القلقلة",
    titleEn: "Qalqalah (echo)",
    introAr: "القلقلة اضطراب الصوت عند النطق بالحرف ساكنًا حتى يُسمع له نبرة قوية. حروفها خمسة مجموعة في «قطب جد».",
    introEn: "Qalqalah is a slight bounce of the sound when one of five letters has sukūn: qāf, ṭāʾ, bāʾ, jīm, dāl («قطب جد»).",
    rules: [
      {
        id: "qalqalah-sughra",
        titleAr: "القلقلة الصغرى",
        titleEn: "Qalqalah ṣughrā (minor)",
        letters: "ق ط ب ج د",
        summaryAr: "إذا كان حرف القلقلة ساكنًا في وسط الكلمة أو في آخرها عند الوصل.",
        summaryEn: "A qalqalah letter with sukūn in the middle of a word (or at its end while reading on).",
        examples: [
          { ar: "يَقْطَعُونَ", mark: ["قْ"] },
          { ar: "يَجْعَلُونَ", mark: ["جْ"] },
          { ar: "أَبْصَارِهِمْ", mark: ["بْ"] },
        ],
        keywords: ["qalqala sughra", "minor", "قلقله صغرى"],
      },
      {
        id: "qalqalah-kubra",
        titleAr: "القلقلة الكبرى",
        titleEn: "Qalqalah kubrā (major)",
        summaryAr: "إذا كان حرف القلقلة في آخر الكلمة وسُكّن للوقف، فتكون أوضح.",
        summaryEn: "A qalqalah letter at the end of a word, silenced by stopping — clearer.",
        examples: [
          { ar: "الْفَلَقِ", mark: ["قِ"], noteAr: "عند الوقف: الْفَلَقْ", noteEn: "When stopping: al-falaq" },
          { ar: "مُحِيطٌ", mark: ["طٌ"], noteAr: "عند الوقف", noteEn: "When stopping" },
        ],
        keywords: ["qalqala kubra", "major", "waqf", "قلقله كبرى"],
      },
      {
        id: "qalqalah-akbar",
        titleAr: "القلقلة الكبرى المشددة (الأكبر)",
        titleEn: "Qalqalah on a stressed letter (akbar)",
        summaryAr: "عند الوقف على حرف قلقلة مشدد، فتكون أقوى درجاتها. ويجعلها بعض العلماء ضمن الكبرى ولا يفردونها.",
        summaryEn: "When stopping on a qalqalah letter with shaddah — the strongest degree. Some scholars count it as part of the major level.",
        examples: [
          { ar: "الْحَقُّ", mark: ["قُّ"], noteAr: "عند الوقف", noteEn: "When stopping" },
          { ar: "وَتَبَّ", mark: ["بَّ"], noteAr: "عند الوقف", noteEn: "When stopping" },
        ],
        keywords: ["qalqala akbar", "shadda", "قلقله"],
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    id: "tafkheem",
    titleAr: "التفخيم والترقيق",
    titleEn: "Heavy & light letters",
    introAr: "التفخيم تسمين صوت الحرف، والترقيق تنحيفه. حروف الاستعلاء «خص ضغط قظ» مفخمة دائمًا، وحروف الاستفال مرققة إلا الراء واللام في لفظ الجلالة والألف في بعض الأحوال.",
    introEn: "Tafkhīm makes a letter heavy, tarqīq light. The raised letters «خص ضغط قظ» are always heavy; the others are light — except rāʾ, the lām of “Allāh” and, at times, alif.",
    rules: [
      {
        id: "isti-la",
        titleAr: "حروف الاستعلاء",
        titleEn: "The always-heavy letters",
        letters: "خ ص ض غ ط ق ظ",
        summaryAr: "تُفخَّم دائمًا، وأقواها المطبقة (ص ض ط ظ)، ويتفاوت تفخيمها بحسب حركتها: المفتوح بعده ألف، ثم المفتوح، ثم المضموم، ثم الساكن، ثم المكسور.",
        summaryEn: "Always heavy, the strongest being ṣ ḍ ṭ ẓ. Heaviness depends on the vowel: fatḥah + alif, fatḥah, ḍammah, sukūn, then kasrah.",
        examples: [
          { ar: "قَالَ", mark: ["قَا"] },
          { ar: "الصِّرَاطَ", mark: ["صِّ", "طَ"] },
        ],
        keywords: ["istila", "tafkheem", "heavy", "استعلاء", "تفخيم"],
      },
      {
        id: "alif",
        titleAr: "الألف",
        titleEn: "Alif",
        summaryAr: "الألف تتبع ما قبلها: تُفخَّم بعد حرف مفخم، وتُرقَّق بعد حرف مرقق.",
        summaryEn: "Alif follows the letter before it: heavy after a heavy letter, light after a light one.",
        examples: [
          { ar: "قَالَ", mark: ["قَا"], noteAr: "مفخمة", noteEn: "Heavy" },
          { ar: "كَانَ", mark: ["كَا"], noteAr: "مرققة", noteEn: "Light" },
        ],
        keywords: ["alif", "الف"],
      },
      {
        id: "ra-tafkheem",
        titleAr: "تفخيم الراء",
        titleEn: "Heavy rāʾ",
        letters: "ر",
        summaryAr: "تُفخَّم الراء إذا كانت مفتوحة أو مضمومة، أو ساكنة بعد فتح أو ضم، أو ساكنة بعد كسر عارض، أو ساكنة بعد كسر أصلي وبعدها حرف استعلاء غير مكسور في الكلمة نفسها.",
        summaryEn: "Rāʾ is heavy with fatḥah or ḍammah; with sukūn after fatḥah or ḍammah; after a temporary kasrah; or after an original kasrah when a raised letter follows in the same word.",
        examples: [
          { ar: "رَبِّ", mark: ["رَ"] },
          { ar: "مَرْيَمَ", mark: ["رْ"] },
          { ar: "ارْجِعُوا", mark: ["رْ"], noteAr: "كسر عارض (همزة وصل)", noteEn: "Temporary kasrah (hamzat al-waṣl)" },
          { ar: "قِرْطَاسٍ", mark: ["رْ"], noteAr: "بعدها حرف استعلاء", noteEn: "A raised letter follows" },
        ],
        keywords: ["ra", "raa", "tafkheem", "heavy", "راء", "تفخيم"],
      },
      {
        id: "ra-tarqeeq",
        titleAr: "ترقيق الراء",
        titleEn: "Light rāʾ",
        letters: "ر",
        summaryAr: "تُرقَّق الراء إذا كانت مكسورة، أو ساكنة بعد كسر أصلي وليس بعدها حرف استعلاء، أو ساكنة للوقف بعد ياء ساكنة، أو بعد كسر، أو بعد ساكن مستفل قبله كسر (مثل: ذِكْرٌ).",
        summaryEn: "Rāʾ is light with kasrah; with sukūn after an original kasrah and no raised letter after it; or silenced by stopping after yāʾ sākinah, after kasrah, or after a light silent letter preceded by kasrah (e.g. dhikr).",
        pointsAr: ["فيها وجهان (التفخيم والترقيق) في مواضع منها: ﴿فِرْقٍ﴾ بالشعراء، و﴿مِصْرَ﴾ و﴿الْقِطْرِ﴾ عند الوقف."],
        pointsEn: ["Both ways are allowed in a few words, e.g. firq (ash-Shuʿarāʾ), and miṣr and al-qiṭr when stopping."],
        examples: [
          { ar: "رِجَالٌ", mark: ["رِ"] },
          { ar: "فِرْعَوْنَ", mark: ["رْ"] },
          { ar: "قَدِيرٌ", mark: ["رٌ"], noteAr: "عند الوقف بعد ياء ساكنة", noteEn: "When stopping, after yāʾ sākinah" },
        ],
        keywords: ["ra", "raa", "tarqeeq", "light", "راء", "ترقيق"],
      },
      {
        id: "lam-jalalah",
        titleAr: "اللام في لفظ الجلالة",
        titleEn: "The lām of “Allāh”",
        summaryAr: "تُفخَّم لام لفظ الجلالة إذا سبقها فتح أو ضم، وتُرقَّق إذا سبقها كسر.",
        summaryEn: "The lām in “Allāh” is heavy after fatḥah or ḍammah and light after kasrah.",
        pointsAr: ["إذا بُدئ بلفظ الجلالة فُخّمت اللام لأن همزة الوصل مفتوحة."],
        pointsEn: ["When starting with “Allāh”, the lām is heavy (the hamzat al-waṣl has fatḥah)."],
        examples: [
          { ar: "قَالَ اللَّهُ", mark: ["اللَّهُ"], noteAr: "تفخيم بعد فتح", noteEn: "Heavy after fatḥah" },
          { ar: "رُسُلُ اللَّهِ", mark: ["اللَّهِ"], noteAr: "تفخيم بعد ضم", noteEn: "Heavy after ḍammah" },
          { ar: "بِسْمِ اللَّهِ", mark: ["اللَّهِ"], noteAr: "ترقيق بعد كسر", noteEn: "Light after kasrah" },
        ],
        keywords: ["lam", "allah", "jalalah", "لام", "لفظ الجلاله"],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Offline search                                                      */
/* ------------------------------------------------------------------ */

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** Search key: lower case, Arabic without diacritics and with unified letter forms, Latin without accents. */
export const tajweedKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(MARKS, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ʿʾ'’`]/g, "").replace(/\s+/g, " ").trim();

const haystack = new Map<string, string>();
function ruleText(r: TajweedRule, c: TajweedCategory) {
  let h = haystack.get(r.id);
  if (!h) {
    h = tajweedKey([c.titleAr, c.titleEn, r.titleAr, r.titleEn, r.letters ?? "", r.summaryAr, r.summaryEn, ...(r.pointsAr ?? []), ...(r.pointsEn ?? []),
      ...r.examples.flatMap((e) => [e.ar, e.noteAr ?? "", e.noteEn ?? ""]), ...(r.keywords ?? [])].join(" | "));
    haystack.set(r.id, h);
  }
  return h;
}

/** Rules matching every word of the query (Arabic or English), grouped by category. */
export function searchTajweed(query: string, categories: readonly TajweedCategory[] = TAJWEED): { category: TajweedCategory; rules: TajweedRule[] }[] {
  const words = tajweedKey(query).split(" ").filter(Boolean);
  return categories
    .map((category) => ({
      category,
      rules: words.length ? category.rules.filter((r) => { const h = ruleText(r, category); return words.every((w) => h.includes(w) || h.includes(w.replace(/^ال/, ""))); }) : category.rules,
    }))
    .filter((g) => g.rules.length)
    // Categories whose own title matches come first (e.g. "qalqalah" → the Qalqalah category).
    .sort((x, y) => Number(titleHit(y.category, words)) - Number(titleHit(x.category, words)));
}

const titleHit = (c: TajweedCategory, words: string[]) => {
  if (!words.length) return false;
  const t = tajweedKey(`${c.titleAr} ${c.titleEn} ${c.id}`);
  return words.every((w) => t.includes(w) || t.includes(w.replace(/^ال/, "")));
};
