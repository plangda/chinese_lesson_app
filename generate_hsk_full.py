import os
import csv
import json
import time
import argparse
import urllib.request
import urllib.parse
import google.generativeai as genai
from dotenv import load_dotenv

# Load API key
load_dotenv(os.path.expanduser('~/.env'))
load_dotenv('.env') # Load the local .env containing Turso credentials
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

CSV_PATH = 'hsk30.csv'

# Set up the Gemini model with JSON response type
model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})

def get_youdao_meaning(word):
    clean_word = word.split('|')[0]
    url = f"https://dict.youdao.com/suggest?num=1&doctype=json&q={urllib.parse.quote(clean_word)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            entries = data.get("data", {}).get("entries", [])
            if entries:
                explain = entries[0].get("explain", "")
                if ". " in explain:
                    explain = explain.split(". ", 1)[1]
                return explain.strip()
    except Exception:
        pass
    return None

def translate_en_to_th(text):
    if not text:
        return ""
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q={urllib.parse.quote(text)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            translations = data[0]
            result = "".join(segment[0] for segment in translations if segment[0])
            return result
    except Exception:
        pass
    return ""

def read_hsk_words(level):
    words = []
    file_path = CSV_PATH
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Level', row.get('level')) == str(level):
                fallback = row['CEDICT'].split('|')[0] if row['CEDICT'] else row['Simplified']
                is_chinese = any('\u4e00' <= char <= '\u9fff' for char in fallback)
                words.append({
                    "character": row['Simplified'],
                    "pinyin": row['Pinyin'],
                    "meaning": fallback if not is_chinese else ""
                })
    return words

def generate_lesson_content(words_chunk, day_number, hsk_level="hsk2", theme_name=None):
    words_str = json.dumps(words_chunk, ensure_ascii=False)
    theme_instruction = f"The overall theme for this lesson should be around: '{theme_name}'." if theme_name else "You must create a highly engaging, thematic 4-stage Chinese lesson for these words."
    
    prompt = f"""
    You are an expert Chinese teacher. I will give you a list of Chinese vocabulary words.
    {theme_instruction}
    
    Vocabulary Words: {words_str}
    
    You MUST output valid JSON only, using the EXACT structure below. Do NOT use markdown code blocks or extra text.
    {{
        "title": "A thematic title for this lesson (e.g., 'At the Airport')",
        "vocab": [
            {{
                "character": "...",
                "pinyin": "...",
                "meaning": "...",
                "translation_th": "Thai translation of the meaning",
                "deconstruct": "Explain the radicals/components briefly",
                "example_sentence": "A simple example sentence using this word",
                "example_translation_en": "English for example",
                "example_translation_th": "Thai for example"
            }}
            // MUST return an entry for EVERY word in the provided list
        ],
        "grammar": [
            {{
                "title": "A grammar point utilizing some of the vocab",
                "explanation": "Clear explanation",
                "examples": [
                    {{"cn": "...", "py": "...", "en": "..."}},
                    {{"cn": "...", "py": "...", "en": "..."}}
                ],
                "practice": {{
                    "prompt": "Fill in the blank:",
                    "words": ["word1", "word2"],
                    "answer": ["word1"]
                }}
            }}
            // Provide 1 or 2 grammar points
        ],
        "dialogue": {{
            "title": "A dialogue using the vocab",
            "lines": [
                {{"speaker": "A", "cn": "...", "py": "...", "en": "...", "th": "..."}},
                {{"speaker": "B", "cn": "...", "py": "...", "en": "...", "th": "..."}}
            ]
        }}
    }}
    """
    
    response = model.generate_content(prompt)
    try:
        data = json.loads(response.text)
        # Validation checks
        if "vocab" not in data or "grammar" not in data or "dialogue" not in data:
            raise ValueError("Missing core section (vocab, grammar, dialogue)")
        if len(data.get("grammar", [])) == 0:
            raise ValueError("Missing grammar points")
        for v in data.get("vocab", []):
            if "translation_th" not in v or "example_sentence" not in v:
                raise ValueError("Vocab missing translation_th or example_sentence")
        return data
    except Exception as e:
        print(f"Error parsing/validating JSON for Day {day_number}: {e}")
        return None

def is_lesson_complete(data):
    required_keys = ["id", "title", "vocab", "grammar", "dialogue"]
    if not all(k in data for k in required_keys):
        return False
    if not isinstance(data.get("vocab"), list) or len(data["vocab"]) == 0:
        return False
    if not isinstance(data.get("grammar"), list) or len(data["grammar"]) == 0:
        return False
    dialogue = data.get("dialogue")
    if not isinstance(dialogue, dict) or "lines" not in dialogue:
        return False
    if not isinstance(dialogue.get("lines"), list) or len(dialogue["lines"]) == 0:
        return False
    return True

def clean_and_load_generated_lessons():
    lessons = {}
    file_path = "generated_lessons.jsonl"
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    if is_lesson_complete(data):
                        lessons[data["id"]] = data
                except Exception:
                    pass
        # Rewrite the file with only valid, sorted lessons
        with open(file_path, "w", encoding="utf-8") as f:
            for lesson_id in sorted(lessons.keys(), key=lambda x: int(x.split('_day')[1]) if '_day' in x else 0):
                f.write(json.dumps(lessons[lesson_id], ensure_ascii=False) + "\n")
    return set(lessons.keys())

def add_thai_translations_to_lesson(lesson_data):
    if not lesson_data:
        return
    
    if not lesson_data.get("title_th"):
        lesson_data["title_th"] = translate_en_to_th(lesson_data.get("title"))

    # Translate vocabulary fields
    for v in lesson_data.get("vocab", []):
        if not v.get("deconstruct_th") and v.get("deconstruct"):
            v["deconstruct_th"] = translate_en_to_th(v.get("deconstruct"))
        if not v.get("translation_th") and v.get("meaning"):
            v["translation_th"] = translate_en_to_th(v.get("meaning"))
        if not v.get("example_translation_th") and v.get("example_translation_en"):
            v["example_translation_th"] = translate_en_to_th(v.get("example_translation_en"))

    # Translate grammar fields
    for g in lesson_data.get("grammar", []):
        if not g.get("title_th"):
            g["title_th"] = translate_en_to_th(g.get("title"))
        if not g.get("explanation_th"):
            g["explanation_th"] = translate_en_to_th(g.get("explanation"))
        
        # Examples
        for ex in g.get("examples", []):
            if not ex.get("th"):
                ex["th"] = translate_en_to_th(ex.get("en"))
                
        # Practice
        if "practice" in g and g["practice"].get("prompt"):
            if not g["practice"].get("prompt_th"):
                g["practice"]["prompt_th"] = translate_en_to_th(g["practice"].get("prompt"))

    # Translate dialogue fields
    dial = lesson_data.get("dialogue")
    if dial:
        if not dial.get("title_th"):
            dial["title_th"] = translate_en_to_th(dial.get("title"))
        for line in dial.get("lines", []):
            if not line.get("th") and line.get("en"):
                line["th"] = translate_en_to_th(line.get("en"))

def insert_lesson_to_db(db, lesson_data, day_number, hsk_level="hsk2"):
    lesson_id = f"{hsk_level}_day{day_number}"
    lesson_data["id"] = lesson_id
    lesson_data["hsk_level"] = hsk_level
    lesson_data["day_number"] = day_number
    
    with open("generated_lessons.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(lesson_data, ensure_ascii=False) + "\n")

def clean_char_variants(character):
    if not character:
        return ""
    return character.split('|')[0].strip()

def run_generation(level=2, chunk_size=10, limit=None, existing_ids=None):
    if existing_ids is None:
        existing_ids = set()
        
    words = read_hsk_words(level)
    print(f"Total HSK {level} words loaded: {len(words)}")
    
    hsk_id = f"hsk{level}"
    generated_count = 0
    
    # Try to load themes for this level dynamically
    themes = []
    for suffix in ['_themes_final.json', '_themes.json']:
        theme_path = f"hsk{level}{suffix}"
        if os.path.exists(theme_path):
            try:
                with open(theme_path, 'r', encoding='utf-8') as f:
                    themes = json.load(f)
                print(f"Loaded themes mapping from {theme_path}")
                break
            except Exception as e:
                print(f"Error loading theme file {theme_path}: {e}")
                
    if themes:
        remaining_words = list(words)
        chunks = []
        theme_names = []
        for t in themes:
            theme_chunk = []
            for w_char in t.get('words', []):
                matched = False
                w_char_clean = clean_char_variants(w_char)
                for i, w_dict in enumerate(remaining_words):
                    if clean_char_variants(w_dict['character']) == w_char_clean:
                        theme_chunk.append(remaining_words.pop(i))
                        matched = True
                        break
                if not matched:
                    # Fail loudly by logging warnings (encode to ascii backslashreplace to prevent Windows console encoding crashes)
                    msg = f"  [Warning] Word '{w_char}' in theme '{t.get('theme')}' was not found in remaining HSK pool."
                    print(msg.encode('ascii', 'backslashreplace').decode('ascii'))
            if theme_chunk:
                chunks.append(theme_chunk)
                theme_names.append(t.get('theme', ''))
                
        for i in range(0, len(remaining_words), 15):
            chunks.append(remaining_words[i:i+15])
            theme_names.append("Additional Vocabulary")
            
        total_lessons = len(chunks)
        skipped_count = 0
        
        for i, (chunk, t_name) in enumerate(zip(chunks, theme_names), start=1):
            day_number = i
            lesson_id = f"{hsk_id}_day{day_number}"
            
            if lesson_id in existing_ids:
                skipped_count += 1
                continue
                
            if limit is not None and generated_count >= limit:
                break
                
            print(f"Generating Day {day_number}/{total_lessons} ({len(chunk)} words)... Theme: {t_name}")
            # Resolve English meanings upfront via Youdao Suggestion API
            for word_dict in chunk:
                if not word_dict.get("meaning"):
                    meaning = get_youdao_meaning(word_dict["character"])
                    word_dict["meaning"] = meaning if meaning else word_dict["character"]
                    time.sleep(0.2) # Avoid aggressive API hits
                    
            max_retries = 5
            success = False
            for attempt in range(max_retries):
                try:
                    lesson_data = generate_lesson_content(chunk, day_number, hsk_id, t_name)
                    if lesson_data:
                        add_thai_translations_to_lesson(lesson_data)
                        insert_lesson_to_db(None, lesson_data, day_number, hsk_id)
                        print(f"  OK Day {day_number} saved successfully.")
                        success = True
                        break
                except Exception as e:
                    print(f"  Attempt {attempt+1} failed: {e}")
                    time.sleep(65)
                    
            if not success:
                raise RuntimeError("Stopping pipeline due to API failures.")
                
            generated_count += 1
            time.sleep(6) # RPM Throttle
            
        print(f"\n=========================================")
        print(f"HANPATH CURRICULUM SEEDING PROGRESS REPORT")
        print(f"=========================================")
        print(f"Level: HSK {level}")
        print(f"- Total Target Lessons: {total_lessons}")
        print(f"- Previously Seeded: {skipped_count}")
        print(f"- Newly Generated this Run: {generated_count}")
        print(f"- Remaining Lessons to Generate: {total_lessons - (skipped_count + generated_count)}")
        print(f"- Completion Status: {((skipped_count + generated_count) / total_lessons * 100):.1f}%")
        print(f"=========================================\n")
        
        return generated_count
    else:
        chunks = [words[i:i+chunk_size] for i in range(0, len(words), chunk_size)]
        total_lessons = len(chunks)
        skipped_count = 0
        
        for i, chunk in enumerate(chunks, start=1):
            day_number = i
            lesson_id = f"{hsk_id}_day{day_number}"
            
            if lesson_id in existing_ids:
                skipped_count += 1
                continue
                
            if limit is not None and generated_count >= limit:
                break
                
            print(f"Generating Day {day_number}/{total_lessons} ({len(chunk)} words)...")
            # Resolve English meanings upfront via Youdao Suggestion API
            for word_dict in chunk:
                if not word_dict.get("meaning"):
                    meaning = get_youdao_meaning(word_dict["character"])
                    word_dict["meaning"] = meaning if meaning else word_dict["character"]
                    time.sleep(0.2) # Avoid aggressive API hits
                    
            max_retries = 5
            success = False
            for attempt in range(max_retries):
                try:
                    lesson_data = generate_lesson_content(chunk, day_number, hsk_id)
                    if lesson_data:
                        add_thai_translations_to_lesson(lesson_data)
                        insert_lesson_to_db(None, lesson_data, day_number, hsk_id)
                        print(f"  OK Day {day_number} saved successfully.")
                        success = True
                        break
                except Exception as e:
                    print(f"  Attempt {attempt+1} failed: {e}")
                    time.sleep(65)
                    
            if not success:
                raise RuntimeError("Stopping pipeline due to repeated API failures.")
                
            generated_count += 1
            time.sleep(6) # RPM Throttle
            
        print(f"\n=========================================")
        print(f"HANPATH CURRICULUM SEEDING PROGRESS REPORT")
        print(f"=========================================")
        print(f"Level: HSK {level}")
        print(f"- Total Target Lessons: {total_lessons}")
        print(f"- Previously Seeded: {skipped_count}")
        print(f"- Newly Generated this Run: {generated_count}")
        print(f"- Remaining Lessons to Generate: {total_lessons - (skipped_count + generated_count)}")
        print(f"- Completion Status: {((skipped_count + generated_count) / total_lessons * 100):.1f}%")
        print(f"=========================================\n")
        
        return generated_count

if __name__ == "__main__":
    print("=== Phase 1-3: Full HSK Generation Pipeline ===")
    print("Google Gemini Flash limit: 1500 Requests Per Day")
    
    parser = argparse.ArgumentParser(description="HanPath Curriculum Generator")
    parser.add_argument("-l", "--limit", type=int, default=None, help="Maximum number of lessons to generate in this run")
    args = parser.parse_args()
    
    # 1. Clean and load existing lessons
    existing_ids = clean_and_load_generated_lessons()
    print(f"Loaded {len(existing_ids)} valid lessons from generated_lessons.jsonl (garbage collected invalid records).")
    
    global_budget = args.limit
    
    # HSK 1 (300 words) -> Chunk size ~15 -> ~20-30 lessons
    print("\n--- HSK 1 ---")
    hsk1_gen = run_generation(level=1, chunk_size=15, limit=global_budget, existing_ids=existing_ids)
    if global_budget is not None:
        global_budget -= hsk1_gen
        if global_budget <= 0:
            print("Batch generation limit reached for this run.")
            exit(0)
    
    # HSK 2 (772 words) -> Chunk size 20 -> ~39 lessons
    print("\n--- HSK 2 ---")
    hsk2_gen = run_generation(level=2, chunk_size=20, limit=global_budget, existing_ids=existing_ids)
    if global_budget is not None:
        global_budget -= hsk2_gen
        if global_budget <= 0:
            print("Batch generation limit reached for this run.")
            exit(0)
    
    # HSK 3 (973 words) -> Chunk size 25 -> ~39 lessons
    print("\n--- HSK 3 ---")
    hsk3_gen = run_generation(level=3, chunk_size=25, limit=global_budget, existing_ids=existing_ids)
    
    print("\nFull pipeline complete!")
