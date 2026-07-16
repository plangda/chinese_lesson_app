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
    return libsql_client.create_client_sync(
        url=os.environ.get("TURSO_DATABASE_URL"),
        auth_token=os.environ.get("TURSO_AUTH_TOKEN")
    )

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

def generate_lesson_content(words_chunk, day_number, hsk_level="hsk2"):
    words_str = json.dumps(words_chunk, ensure_ascii=False)
    prompt = f"""
    You are an expert Chinese teacher. I will give you a list of Chinese vocabulary words.
    You must create a highly engaging, thematic 4-stage Chinese lesson for these words.
    
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
                "type": "vocab",
                "question": "Which word means ...?",
                "options": ["A", "B", "C", "D"],
                "answer": "A",
                "explanation": "Because..."
            }},
            {{
                "type": "grammar",
                "question": "Fill in the blank: ...",
                "options": ["A", "B", "C", "D"],
                "answer": "A",
                "explanation": "Because..."
            }}
            // Provide 4-6 quiz questions covering vocab, pinyin, and grammar
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
    cursor = db.cursor()
    lesson_id = f"{hsk_level}_day{day_number}"
    
    try:
        # 1. Insert Lesson
        cursor.execute(
            "INSERT OR REPLACE INTO lessons (id, hsk_level, day_number, title, duration_minutes) VALUES (?, ?, ?, ?, ?)",
            (lesson_id, hsk_level, day_number, lesson_data.get('title', 'Unknown Theme'), 60)
        )
        
        # 2. Insert Vocab
        for i, word in enumerate(lesson_data['vocab']):
            cursor.execute(
                """INSERT INTO vocab (lesson_id, character, pinyin, meaning, deconstruct, example_cn, example_py, example_en, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (lesson_id, word['character'], word['pinyin'], word['meaning'], word.get('deconstruct',''), 
                 word.get('example_cn',''), word.get('example_py',''), word.get('example_en',''), i)
            )
            
        # 3. Insert Grammar
        for i, gram in enumerate(lesson_data.get('grammar', [])):
            cursor.execute(
                "INSERT INTO grammar (lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?)",
                (lesson_id, gram['title'], gram['explanation'], i)
            )
            grammar_id = cursor.lastrowid
            
            for j, ex in enumerate(gram.get('examples', [])):
                cursor.execute(
                    "INSERT INTO grammar_examples (grammar_id, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?)",
                    (grammar_id, ex['cn'], ex['py'], ex['en'], j)
                )
                
            if 'practice' in gram:
                p = gram['practice']
                cursor.execute(
                    "INSERT INTO grammar_practice (grammar_id, prompt, words, answer) VALUES (?, ?, ?, ?)",
                    (grammar_id, p['prompt'], json.dumps(p.get('words', [])), json.dumps(p.get('answer', [])))
                )
                
        # 4. Insert Dialogue
        dial = lesson_data.get('dialogue')
        if dial:
            cursor.execute("INSERT INTO dialogues (lesson_id, title) VALUES (?, ?)", (lesson_id, dial['title']))
            dial_id = cursor.lastrowid
            for i, line in enumerate(dial.get('lines', [])):
                cursor.execute(
                    "INSERT INTO dialogue_lines (dialogue_id, speaker, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                    (dial_id, line.get('speaker', 'A'), line['cn'], line['py'], line['en'], i)
                )
                
        # 5. Insert Quiz
        for i, q in enumerate(lesson_data.get('quiz', [])):
            cursor.execute(
                """INSERT INTO quizzes (lesson_id, type, testWord, question, options, answer, explanation, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (lesson_id, q.get('type', 'vocab'), q.get('testWord', ''), q.get('question', ''), 
                 json.dumps(q.get('options', [])), q.get('answer', ''), q.get('explanation', ''), i)
            )
            
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

def run_generation(level=2, chunk_size=10, limit=None):
    words = read_hsk_words(level)
    print(f"Total HSK {level} words loaded: {len(words)}")
    
    db = get_db()
    hsk_id = f"hsk{level}"
    
    # Check how many days already exist for this level
    cursor = db.cursor()
    cursor.execute("SELECT MAX(day_number) FROM lessons WHERE hsk_level = ?", (hsk_id,))
    max_day = cursor.fetchone()[0] or 0
    start_idx = max_day * chunk_size
    
    print(f"Resuming from Day {max_day + 1} (Word index {start_idx})")
    
    day_number = max_day + 1
    generated_count = 0
    
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
                    insert_lesson_to_db(db, lesson_data, day_number, hsk_id)
                    print(f"  OK Day {day_number} saved successfully.")
                    success = True
                    break
            except Exception as e:
                print(f"  Attempt {attempt+1} failed: {e}")
                print("  Sleeping for 65 seconds to respect rate limits...")
                time.sleep(65)
                
        if not success:
            print(f"  FAIL Failed to generate Day {day_number} after {max_retries} attempts.")
            raise RuntimeError("Stopping pipeline due to repeated API failures (likely daily quota limit reached).")
            
        day_number += 1
        generated_count += 1
        time.sleep(2) # rate limit pause

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
