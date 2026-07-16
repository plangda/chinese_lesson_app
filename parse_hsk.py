import re

with open('temp_hsk/hsk30-main/wordlist.txt', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

levels = {}
current_level = None

for line in lines:
    if line.startswith('#') or not line.strip():
        continue
    if "三级" in line:
        current_level = "Level 3"
    elif "二级" in line:
        current_level = "Level 2"
    elif "一级" in line:
        current_level = "Level 1"
    elif "四级" in line:
        current_level = "Level 4"
    elif current_level:
        parts = line.split('\t')
        if not parts or len(parts) == 0:
            parts = line.split(' ')
        if len(parts) >= 2:
            word = parts[1]
            levels.setdefault(current_level, []).append(word)

for k, v in levels.items():
    print(f'{k}: {len(v)} words')
