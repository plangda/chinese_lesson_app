import json
import csv
import re

print("Parsing hsk30.csv...")
pinyin_map = {}

# We'll also use a tiny hardcoded fallback for common single tone syllables if they are missing
hardcoded = {
    "a1": "阿", "a2": "啊", "a3": "啊", "a4": "啊",
    "o1": "噢", "o2": "哦", "o3": "哦", "o4": "哦",
    "e1": "阿", "e2": "额", "e3": "恶", "e4": "饿",
    "ma1": "妈", "ma2": "麻", "ma3": "马", "ma4": "骂",
    "ba1": "八", "ba2": "拔", "ba3": "把", "ba4": "爸"
}

for k, v in hardcoded.items():
    pinyin_map[k] = v

try:
    with open("hsk30.csv", "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 4:
                # row[0] is index, row[1] is Hanzi, row[2] is Pinyin with tone marks, row[3] is Translation
                hanzi = row[1]
                # Pinyin might have tone marks like 'bā', we need to convert to numbers 'ba1'
                # Actually, the python script `parse_hsk.py` we used before might have tone marks or numbers.
                # If it's single character, we can just save it.
                if len(hanzi) == 1:
                    # To keep it simple, we will just use the tone marks directly in our JSON!
                    py = row[2].strip().lower()
                    if py and py not in pinyin_map:
                        pinyin_map[py] = hanzi
except Exception as e:
    print("Error reading hsk30.csv", e)

# Wait, if we use tone marks in our matrix, we don't even need the numbers!
# Let's map numbers to marks for building the matrix
tone_marks = {
    'a': ['ā', 'á', 'ǎ', 'à'],
    'e': ['ē', 'é', 'ě', 'è'],
    'o': ['ō', 'ó', 'ǒ', 'ò'],
    'i': ['ī', 'í', 'ǐ', 'ì'],
    'u': ['ū', 'ú', 'ǔ', 'ù'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
}

def add_tone(syllable, tone_num):
    if tone_num == 5:
        return syllable.replace('v', 'ü')
        
    # Vowel priority: a, o, e, i, u, ü
    for v in ['a', 'o', 'e']:
        if v in syllable:
            return syllable.replace(v, tone_marks[v][tone_num-1]).replace('v', 'ü')
            
    # For i and u, the mark goes on the second one if both are present
    if 'iu' in syllable:
        return syllable.replace('u', tone_marks['u'][tone_num-1])
    if 'ui' in syllable:
        return syllable.replace('i', tone_marks['i'][tone_num-1])
        
    for v in ['i', 'u', 'v', 'ü']:
        if v in syllable:
            return syllable.replace(v, tone_marks[v if v != 'ü' else 'v'][tone_num-1])
            
    return syllable

initials = ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"]
finals = [
    "a", "o", "e", "i", "u", "v", 
    "ai", "ei", "ui", "ao", "ou", "iu", "ie", "ve", "er",
    "an", "en", "in", "un", "vn",
    "ang", "eng", "ing", "ong"
]

# We don't have a perfect valid list anymore, so we will generate all possible, but filter out obviously invalid ones
# To do this perfectly, I'll provide a predefined list of valid combinations (without tones).
valid_syllables = set([
    "a","o","e","ai","ei","ao","ou","an","en","ang","eng","er",
    "ba","bo","bai","bei","bao","ban","ben","bang","beng","bi","bie","biao","bian","bin","bing",
    "pa","po","pai","pei","pao","pou","pan","pen","pang","peng","pi","pie","piao","pian","pin","ping",
    "ma","mo","me","mai","mei","mao","mou","man","men","mang","meng","mi","mie","miao","miu","mian","min","ming",
    "fa","fo","fei","fou","fan","fen","fang","feng",
    "da","de","dai","dei","dao","dou","dan","den","dang","deng","dong","di","die","diao","diu","dian","ding","du","duo","dui","duan","dun",
    "ta","te","tai","tei","tao","tou","tan","tang","teng","tong","ti","tie","tiao","tian","ting","tu","tuo","tui","tuan","tun",
    "na","ne","nai","nei","nao","nou","nan","nen","nang","neng","nong","ni","nie","niao","niu","nian","nin","niang","ning","nu","nuo","nuan","nv","nve",
    "la","le","lai","lei","lao","lou","lan","lang","leng","long","li","lia","lie","liao","liu","lian","lin","liang","ling","lu","luo","lui","luan","lun","lv","lve",
    "ga","ge","gai","gei","gao","gou","gan","gen","gang","geng","gong","gu","gua","guo","guai","gui","guan","gun","guang",
    "ka","ke","kai","kei","kao","kou","kan","ken","kang","keng","kong","ku","kua","kuo","kuai","kui","kuan","kun","kuang",
    "ha","he","hai","hei","hao","hou","han","hen","hang","heng","hong","hu","hua","huo","huai","hui","huan","hun","huang",
    "ji","jia","jie","jiao","jiu","jian","jin","jiang","jing","jiong","ju","jue","juan","jun",
    "qi","qia","qie","qiao","qiu","qian","qin","qiang","qing","qiong","qu","que","quan","qun",
    "xi","xia","xie","xiao","xiu","xian","xin","xiang","xing","xiong","xu","xue","xuan","xun",
    "zha","zhe","zhi","zhai","zhei","zhao","zhou","zhan","zhen","zhang","zheng","zhong","zhu","zhua","zhuo","zhuai","zhui","zhuan","zhun","zhuang",
    "cha","che","chi","chai","chao","chou","chan","chen","chang","cheng","chong","chu","chua","chuo","chuai","chui","chuan","chun","chuang",
    "sha","she","shi","shai","shei","shao","shou","shan","shen","shang","sheng","shui","shuan","shun","shuang","shu","shua","shuo",
    "re","ri","rao","rou","ran","ren","rang","reng","rong","ru","ruo","rui","ruan","run",
    "za","ze","zi","zai","zei","zao","zou","zan","zen","zang","zeng","zong","zu","zuo","zui","zuan","zun",
    "ca","ce","ci","cai","cao","cou","can","cen","cang","ceng","cong","cu","cuo","cui","cuan","cun",
    "sa","se","si","sai","sao","sou","san","sen","sang","seng","song","su","suo","sui","suan","sun",
    "ya","ye","yi","yao","you","yan","yin","yang","ying","yong","yu","yue","yuan","yun",
    "wa","wo","wu","wai","wei","wan","wen","wang","weng"
])

# For v/ü mapping, the user might input ju, qu, xu, yu which are written as u but are actually v
# Our valid_syllables above has 'ju', 'qu', 'xu', 'yu'. We'll map them appropriately when matching initials and finals.

matrix = {}
for i in initials:
    matrix[i] = {}
    for f in finals:
        # Standard spelling adjustments
        spell_f = f
        
        # When combined with j, q, x, y, the 'v' is written as 'u'
        if i in ['j', 'q', 'x', 'y'] and spell_f.startswith('v'):
            spell_f = spell_f.replace('v', 'u')
            
        base_syl = i + spell_f
        
        # There are other spelling rules, but let's just see if base_syl is in our set
        if base_syl in valid_syllables:
            tones = []
            for tone in range(1, 5):
                # We need the pinyin with tone mark
                py_mark = add_tone(i + f, tone)
                
                # Fetch character from our map
                char = pinyin_map.get(py_mark, "")
                if not char and py_mark in hardcoded:
                    char = hardcoded[py_mark]
                    
                tones.append({
                    "pinyin": py_mark,
                    "character": char
                })
                
            matrix[i][f] = {
                "base": base_syl,
                "tones": tones
            }

output = {
    "initials": initials,
    "finals": finals,
    "matrix": matrix
}

with open("pinyin_data.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Generated pinyin_data.json with", sum(len(row) for row in matrix.values()), "valid syllables!")
