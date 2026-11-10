#!/usr/bin/env python3
"""Rebuilds public/mushaf/layout.json and words.json from the Madani Mushaf layout dataset.

  git clone --depth 1 https://github.com/zonetecde/mushaf-layout /tmp/mushaf-layout
  python3 scripts/build-mushaf-data.py /tmp/mushaf-layout

Checks: 604 pages, 6236 verses, every verse has contiguous words and exactly one end marker.
"""
import json, re, sys, collections
SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/mushaf-layout"
D = f"{SRC}/mushaf/QPC2"
DIG = re.compile(r"^(.*?)\s*([٠-٩]+)$")
JUZ = [(1,1),(2,142),(2,253),(3,93),(4,24),(4,148),(5,82),(6,111),(7,88),(8,41),(9,93),(11,6),(12,53),(15,1),(17,1),(18,75),(21,1),(23,1),(25,21),(27,56),(29,46),(33,31),(36,28),(39,32),(41,47),(46,1),(51,31),(58,1),(67,1),(78,1)]
words = collections.defaultdict(dict); pages = []
for n in range(1, 605):
    d = json.load(open(f"{D}/page-{n:03d}.json")); lines = []
    for l in sorted(d["lines"], key=lambda x: x["line"]):
        if l["type"] == "surah-header": lines.append([0, int(l["surah"])]); continue
        if l["type"] == "basmala": lines.append([1]); continue
        segs = []
        for w in l["words"]:
            s, a, i = map(int, w["location"].split(":")); tok = w["word"].strip(); m = DIG.match(tok)
            txt = m.group(1).strip() if m else tok
            if txt: words[(s, a)][i] = txt
            if segs and segs[-1][:2] == [s, a] and txt and segs[-1][3] == i - 1 and not segs[-1][4]: segs[-1][3] = i
            else: segs.append([s, a, i, i, 0] if txt else [s, a, 0, 0, 0])
            if m: segs[-1][4] = 1
        lines.append([2, segs])
    pages.append(lines)
meta = json.load(open(f"{SRC}/src/data/surahs.json")); out = []
for s in range(1, 115):
    sv = []
    for a in range(1, meta[s - 1]["totalAyah"] + 1):
        ws = words[(s, a)]; assert sorted(ws) == list(range(1, len(ws) + 1)), (s, a)
        sv.append([ws[i] for i in range(1, len(ws) + 1)])
    out.append(sv)
assert sum(len(s) for s in out) == 6236
# v29 corrections, checked against Quran.com's Uthmani text (api/v4/quran/verses/uthmani):
#  - 84:21's verse-end marker sat after its 2nd word («وإذا قرئ ۝٢١ عليهم القرآن…»): it ends after word 6;
#  - 11:13 «ٱفْتَرَىٰهُ» and 80:25 «أَنَّا» (wrong alif forms), 27:26 a stray RTL mark after «۩».
for pg in pages:
    for ln in pg:
        if ln[0] == 2 and [84, 21, 0, 0, 1] in ln[1] and [84, 21, 1, 2, 0] in ln[1]:
            ln[1] = [x for x in ln[1] if x != [84, 21, 0, 0, 1]]
        if ln[0] == 2:
            ln[1] = [[84, 21, 3, 6, 1] if x == [84, 21, 3, 6, 0] else x for x in ln[1]]
out[10][12][2] = "ٱفْتَرَىٰهُ ۖ"
out[79][24][0] = "أَنَّا"
out[26][25][7] = out[26][25][7].replace("\u200f", "")
json.dump({"v": 1, "source": "Madani Mushaf (QPC V2 layout, 604 pages x 15 lines) via github.com/zonetecde/mushaf-layout, text from Quran.com", "juz": [list(j) for j in JUZ], "pages": pages}, open("public/mushaf/layout.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({"v": 1, "source": "Uthmani Hafs text per word (Quran.com via github.com/zonetecde/mushaf-layout)", "surahs": out}, open("public/mushaf/words.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("ok: 604 pages, 6236 verses")
