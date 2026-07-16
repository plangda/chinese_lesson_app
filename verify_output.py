import json

with open("hsk1_data.js", encoding="utf-8") as f:
    raw = f.read()

data = raw.replace("window.HSK1_CURRICULUM = ", "").rstrip(";")
lessons = json.loads(data)

print(f"Total lessons: {len(lessons)}")

# Check lesson 1
l1 = lessons[0]
print(f"\nLesson 1: {l1['title']}")
print(f"  Vocab count: {len(l1['vocab'])}")
print(f"\n  First word:")
v = l1["vocab"][0]
print(f"    Character: {v['character']}")
print(f"    ExampleCn: {v['exampleCn']}")
print(f"    ExamplePy: {v['examplePy']}")
print(f"    ExampleEn: {v['exampleEn']}")

# Check for broken pattern
print("\n--- Checking for broken 'this is a X' pattern ---")
broken = 0
total = 0
for lesson in lessons:
    for vocab in lesson["vocab"]:
        total += 1
        if "This is a" in vocab.get("exampleEn", ""):
            broken += 1
            print(f"  BROKEN: {vocab['character']} -> {vocab['exampleEn']}")

print(f"\nResult: {broken} broken sentences out of {total} total. {'PASS - all fixed!' if broken == 0 else 'FAIL'}")

# Show sample from first lesson
print("\n--- Sample dialogue ---")
for line in l1["dialogue"]["lines"][:3]:
    print(f"  {line['speaker']}: {line['cn']}")
    print(f"     ({line['en']})")
