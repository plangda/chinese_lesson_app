import os
import csv
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv
import libsql_client

# Load API key
load_dotenv(os.path.expanduser('~/.env'))
load_dotenv('.env') # Load the local .env containing Turso credentials
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

CSV_PATH = 'hsk30.csv'

# Set up the Gemini model with JSON response type
model = genai.GenerativeModel('gemini-2.5-flash-lite', generation_config={"response_mime_type": "application/json"})

def get_db():
    return None

def read_hsk_words(level):
    words = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Level', row.get('level')) == str(level):
                words.append({
                    "character": row['Simplified'],
                    "pinyin": row['Pinyin'],
                    "meaning": row['CEDICT'].split('|')[0] if row['CEDICT'] else row['Simplified']
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
                "deconstruct": "Explain the radicals/components briefly",
                "example_cn": "A simple example sentence using this word",
                "example_py": "pinyin for example",
                "example_en": "English for example"
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
                {{"speaker": "A", "cn": "...", "py": "...", "en": "..."}},
                {{"speaker": "B", "cn": "...", "py": "...", "en": "..."}}
            ]
        }},
        "quiz": [
            {{
                "type": "true_false",
                "question": "Does this word match the meaning? Word: [Word], Meaning: [Meaning]",
                "options": ["True", "False"],
                "answer": "True",
                "explanation": "Because..."
            }},
            {{
                "type": "fill_in_the_blank",
                "question": "Complete the sentence: 我 ___ 喝茶。 (I like to drink tea.)",
                "options": ["爱", "不", "很", "是"],
                "answer": "爱",
                "explanation": "Because..."
            }},
            {{
                "type": "reading_comprehension",
                "question": "Choose the best response to this statement: 你好吗？",
                "options": ["我很好", "再见", "谢谢", "对不起"],
                "answer": "我很好",
                "explanation": "Because..."
            }}
            // Provide 4-6 quiz questions closely mocking the official HSK 1 exam formats.
        ]
    }}
    """
    
    response = model.generate_content(prompt)
    try:
        return json.loads(response.text)
    except Exception as e:
        print(f"Error parsing JSON for Day {day_number}: {e}")
        return None

def insert_lesson_to_db(db, lesson_data, day_number, hsk_level="hsk2"):
    lesson_id = f"{hsk_level}_day{day_number}"
    lesson_data["id"] = lesson_id
    lesson_data["hsk_level"] = hsk_level
    lesson_data["day_number"] = day_number
    
    with open("generated_lessons.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(lesson_data, ensure_ascii=False) + "\n")

def run_generation(level=2, chunk_size=10, limit=None):
    words = read_hsk_words(level)
    print(f"Total HSK {level} words loaded: {len(words)}")
    
    hsk_id = f"hsk{level}"
    
    # We write to generated_lessons.jsonl now, start from day 0
    max_day = 0
    
    day_number = max_day + 1
    generated_count = 0
    
    if level == 1:
        try:
            with open('hsk1_themes.json', 'r', encoding='utf-8') as f:
                themes = json.load(f)
        except Exception:
            themes = []
            
        remaining_words = list(words)
        chunks = []
        theme_names = []
        for t in themes:
            theme_chunk = []
            for w_char in t.get('words', []):
                for i, w_dict in enumerate(remaining_words):
                    if w_dict['character'] == w_char:
                        theme_chunk.append(remaining_words.pop(i))
                        break
            if theme_chunk:
                chunks.append(theme_chunk)
                theme_names.append(t.get('theme', ''))
                
        for i in range(0, len(remaining_words), 15):
            chunks.append(remaining_words[i:i+15])
            theme_names.append("Additional Vocabulary")
            
        chunks_to_process = chunks[max_day:]
        themes_to_process = theme_names[max_day:]
        print(f"Resuming from Day {max_day + 1} (Chunk {max_day})")
        
        for chunk, t_name in zip(chunks_to_process, themes_to_process):
            if limit and generated_count >= limit:
                break
                
            print(f"Generating Day {day_number} ({len(chunk)} words)... Theme: {t_name}")
            max_retries = 5
            success = False
            for attempt in range(max_retries):
                try:
                    lesson_data = generate_lesson_content(chunk, day_number, hsk_id, t_name)
                    if lesson_data:
                        insert_lesson_to_db(None, lesson_data, day_number, hsk_id)
                        print(f"  OK Day {day_number} saved successfully.")
                        success = True
                        break
                except Exception as e:
                    print(f"  Attempt {attempt+1} failed: {e}")
                    time.sleep(65)
                    
            if not success:
                raise RuntimeError("Stopping pipeline due to API failures.")
                
            day_number += 1
            generated_count += 1
            time.sleep(2)
    else:
        start_idx = max_day * chunk_size
        print(f"Resuming from Day {max_day + 1} (Word index {start_idx})")
        for i in range(start_idx, len(words), chunk_size):
            if limit and generated_count >= limit:
                break
                
            chunk = words[i:i+chunk_size]
            print(f"Generating Day {day_number} ({len(chunk)} words)...")
            max_retries = 5
            success = False
            for attempt in range(max_retries):
                try:
                    lesson_data = generate_lesson_content(chunk, day_number, hsk_id)
                    if lesson_data:
                        insert_lesson_to_db(None, lesson_data, day_number, hsk_id)
                        print(f"  OK Day {day_number} saved successfully.")
                        success = True
                        break
                except Exception as e:
                    print(f"  Attempt {attempt+1} failed: {e}")
                    time.sleep(65)
                    
            if not success:
                raise RuntimeError("Stopping pipeline due to repeated API failures.")
                
            day_number += 1
            generated_count += 1
            time.sleep(2)

if __name__ == "__main__":
    print("=== Phase 1-3: Full HSK Generation Pipeline ===")
    print("Google Gemini Flash limit: 1500 Requests Per Day")
    
    # HSK 1 (500 words) -> Chunk size 17 -> ~30 lessons
    print("\n--- HSK 1 ---")
    run_generation(level=1, chunk_size=17, limit=1000)
    
    # HSK 2 (772 words) -> Chunk size 20 -> ~39 lessons
    print("\n--- HSK 2 ---")
    run_generation(level=2, chunk_size=20, limit=1000)
    
    # HSK 3 (973 words) -> Chunk size 25 -> ~39 lessons
    print("\n--- HSK 3 ---")
    run_generation(level=3, chunk_size=25, limit=1000)
    
    print("\nFull pipeline complete!")
