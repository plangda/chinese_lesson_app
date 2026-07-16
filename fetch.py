import urllib.request
import csv

url = 'https://cdn.jsdelivr.net/gh/ivankra/hsk30@master/hsk30.csv'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as res:
        data = res.read().decode('utf-8')
    with open('hsk30.csv', 'w', encoding='utf-8') as f:
        f.write(data)
    
    reader = csv.DictReader(data.splitlines())
    levels = {}
    for row in reader:
        lvl = row.get('level')
        levels.setdefault(lvl, []).append(row)
    
    for k in sorted(levels.keys()):
        print(f'Level {k}: {len(levels[k])} words')
except Exception as e:
    print("Error:", e)
