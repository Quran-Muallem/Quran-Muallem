#!/usr/bin/env python3
"""Locates every Tajweed example (src/data/tajweedData.ts) in the Quran text (public/mushaf/words.json) and
writes src/data/tajweedRefs.json: { example: [surah, ayah, firstWord, lastWord] } — used to play the example
in the selected Sheikh's voice. Run: python3 scripts/build-tajweed-refs.py src/data/tajweedData.ts src/data/tajweedRefs.json"""
import json,re,unicodedata,sys
src=open(sys.argv[1],encoding='utf-8').read()
ex=list(dict.fromkeys(re.findall(r'\{ ar: "([^"]+)"',src)))
w=json.load(open('public/mushaf/words.json'))['surahs']
def base(s):
    s=unicodedata.normalize('NFC',s)
    for a,b in [('ٱ','ا'),('آ','ا'),('أ','ا'),('إ','ا'),('ى','ي'),('ة','ه'),('ؤ','و'),('ئ','ي'),('ٰ','ا')]: s=s.replace(a,b)
    return ''.join(c for c in s if 'ء'<=c<='ي' and c!='ـ')
def loose(s): return re.sub('[اءويي]','',base(s))
words=[(s+1,a+1,i+1,x) for s,su in enumerate(w) for a,ay in enumerate(su) for i,x in enumerate(ay)]
def find(e,f):
    parts=[f(p) for p in e.split() if f(p)]; n=len(parts)
    if not n: return None
    keys=[f(x[3]) for x in words]
    for j in range(len(words)-n+1):
        if keys[j]==parts[0] and all(keys[j+k]==parts[k] for k in range(n)) and len({words[j+k][:2] for k in range(n)})==1:
            return [*words[j][:3],words[j+n-1][2]]
    if n==1:
        for j,k in enumerate(keys):
            if len(parts[0])>=3 and parts[0] in k: return [*words[j][:3],words[j][2]]
    return None
found={};miss=[]
for e in ex:
    h=find(e,base) or find(e,loose)
    if h: found[e]=h
    else: miss.append(e)
print(len(ex),'found',len(found),'miss',miss)
json.dump(found,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
