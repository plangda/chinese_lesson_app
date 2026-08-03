import os
import sys
import csv
import json
import re
import time
import copy
import argparse
import urllib.request
import urllib.parse
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from dotenv import load_dotenv
import json_repair

# Windows consoles default to cp1252, which can't encode CJK/Thai characters
# frequently present in error messages we print (e.g. dropped-citation
# diagnostics) — reconfigure to UTF-8 so those prints don't crash the retry
# loop before it can log the real error or fall back.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Load API key
load_dotenv(os.path.expanduser('~/.env'))
load_dotenv('.env')
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

CSV_PATH = 'hsk30.csv'

GENERATION_MODEL = 'gemini-2.5-flash'
TRANSLATION_MODEL = 'gemini-3.5-flash'
JSON_CONFIG = types.GenerateContentConfig(response_mime_type="application/json")
TRANSLATION_CONFIG = types.GenerateContentConfig(
    response_mime_type="application/json", max_output_tokens=16384
)

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

def _raw_translate(text, target_lang="th"):
    if not text:
        return ""
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={urllib.parse.quote(text)}"
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

# Matches CJK ideographs, CJK/fullwidth punctuation, blank-marker underscores, and a
# short trailing parenthetical (pinyin/gloss) directly attached to a citation. The
# parenthetical excludes sentence-ending punctuation, so a full English gloss sentence
# following the citation (e.g. "(This is my classmate.)" or "(It's snowing outside...)")
# isn't swallowed as if it were part of the citation. Hyphens are allowed (unlike
# sentence-ending punctuation) since many citations use "(pinyin - meaning)" as an
# alternative to "(pinyin, meaning)", e.g. "'亻' (rén - person)". The 80-char cap is
# generous headroom above the longest real gloss in this dataset (69 chars) rather than
# a tight content boundary — the actual "don't require a whole English clause to survive
# translation" guarantee comes from _split_citation() below, which only ever requires
# the leading pinyin token (if any) to survive, never the attached meaning gloss.
_CJK_GLOSS_SUFFIX = r"(?:\s*\([^.!?)]{1,80}\))?"
_CJK_PROTECT_PATTERN = re.compile(
    r"("
    r"'[一-鿿]+'" + _CJK_GLOSS_SUFFIX +
    r"|“[^”]+”" + _CJK_GLOSS_SUFFIX +
    r"|[一-鿿　-〿＀-￯_]+" + _CJK_GLOSS_SUFFIX +
    r")"
)

# Grammar practice prompts are answered by dragging Chinese words into the blank —
# the drag-word pool already shows the candidate answers, so any translation/hint
# the LLM adds is either redundant (whole-sentence gloss with the blank left blank)
# or an outright answer leak (a gloss attached to a specific blank, e.g.
# "你有 ___(สอง)___(个) 铅笔吗？" spells out both blanks' answers). Strip both shapes
# instead of asking a translator to preserve them untranslated.
_TRAILING_GLOSS_PATTERN = re.compile(r"([一-鿿　-〿＀-￯])([\"'“”]*)\s*\([^()]*\)\s*$")
_BLANK_HINT_PATTERN = re.compile(r"(_+)\s*\([^()]*\)")

def _strip_practice_prompt_gloss(prompt):
    if not prompt:
        return prompt
    prompt = _BLANK_HINT_PATTERN.sub(r"\1", prompt)
    prompt = _TRAILING_GLOSS_PATTERN.sub(r"\1\2", prompt)
    return prompt

_RESTORATION_PATTERN = re.compile(
    r"(?:__CIT_|\[\[CIT_|CITEMARK|ไซท์มาร์ก|ไซต์มาร์ก|ไซมาร์ก|ซายท์มาร์ก)\s*(\d+)(?:\]\]|__)?",
    re.IGNORECASE
)

def translate_en_to_th(text):
    if not text:
        return ""
    citations = []

    def replacer(m):
        core, tail = _split_citation(m.group(0))
        citations.append(core)
        # Only `core` (character + pinyin) is frozen behind the placeholder;
        # `tail` (a free-text meaning gloss, if any) is left in place so it
        # gets sent to Google Translate and rendered into Thai like the rest
        # of the sentence, instead of staying stuck in English forever.
        return f" __CIT_{len(citations) - 1}__ {tail}"

    placeholder_text = _CJK_PROTECT_PATTERN.sub(replacer, text)
    remaining = _RESTORATION_PATTERN.sub("", placeholder_text).strip()
    if not remaining:
        return text  # nothing but protected content; no translation needed

    translated = _raw_translate(placeholder_text)
    if not translated:
        return text  # preserve original text if network translation fails

    def restore(m):
        try:
            idx = int(m.group(1))
            return citations[idx] if 0 <= idx < len(citations) else m.group(0)
        except (ValueError, IndexError):
            return m.group(0)

    return _RESTORATION_PATTERN.sub(restore, translated)

def _normalize_ws(text):
    return re.sub(r"\s+", "", text or "")

def _check_field_translation(source_val, translated_val, label, errors):
    if not source_val:
        return
    if not isinstance(translated_val, str):
        errors.append(f"{label}: translation field is not a string (got {type(translated_val).__name__})")
        return
    citations = _extract_citations(source_val)
    translated_norm = _normalize_ws(translated_val)
    for citation in citations:
        if _normalize_ws(citation) not in translated_norm:
            errors.append(f"{label}: citation '{citation}' dropped or altered")
            return
    if not translated_val:
        errors.append(f"{label}: missing Thai translation")
    elif not citations and not contains_thai(translated_val):
        errors.append(f"{label}: Thai field has no Thai script (likely untranslated)")

# Distinguishes a pinyin syllable (must survive verbatim in translation) from a
# free-text English meaning gloss attached in the same parenthetical (fine, and
# often better, to translate) -- e.g. in "'禾' (huò, grain/harvest)", only "huò"
# is required to survive; "grain/harvest" is not. Toned syllables are detected
# by their tone-mark diacritic; a handful of common neutral-tone particles in
# this curriculum (de, le, ne...) carry no diacritic, so they're listed explicitly.
_TONE_MARK_CHARS = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜÜü"
_TONELESS_PINYIN_PARTICLES = {"de", "le", "ne", "ma", "ba", "a", "ya", "men", "er"}

def _looks_like_pinyin(token):
    token = token.strip()
    if not token:
        return False
    if token.lower() in _TONELESS_PINYIN_PARTICLES:
        return True
    return any(ch in _TONE_MARK_CHARS for ch in token)

def _split_citation(full):
    """Split a raw _CJK_PROTECT_PATTERN match into (core, tail): `core` is the
    part that must never be altered by translation -- the character, plus a
    leading pinyin token if the attached parenthetical starts with one -- and
    `tail` is everything else (a free-text meaning gloss, if any), which is
    safe, and often preferable, to translate. Used by both the LLM-path
    validator (which requires `core` to survive verbatim) and the
    Google-Translate fallback (which protects only `core` from translation,
    letting `tail` be translated normally instead of frozen in English).
    Index-based slicing keeps core+tail == full exactly, regardless of the
    original text's whitespace, so callers can always safely concatenate them."""
    paren_idx = full.find("(")
    if paren_idx == -1:
        return full, ""
    char_part = full[:paren_idx].rstrip()
    inner_start = paren_idx + 1
    inner = full[inner_start:-1]
    first_token = re.split(r"[,\s]", inner, 1)[0]
    if _looks_like_pinyin(first_token):
        core_end = inner_start + len(first_token)
        return full[:core_end], full[core_end:]
    return char_part, full[len(char_part):]

def _extract_citations(text):
    if not text:
        return []
    citations = []
    for m in _CJK_PROTECT_PATTERN.finditer(text):
        core, _tail = _split_citation(m.group(0))
        citations.append(core)
    return citations

def find_translation_corruption(original, translated):
    errors = []
    orig_vocab, new_vocab = original.get("vocab", []), translated.get("vocab", [])
    if len(orig_vocab) != len(new_vocab):
        return "vocab array length changed"
    for ov, tv in zip(orig_vocab, new_vocab):
        label = f"vocab[{ov.get('character')}]"
        _check_field_translation(ov.get("meaning"), tv.get("translation_th"), f"{label}.translation_th", errors)
        _check_field_translation(ov.get("deconstruct"), tv.get("deconstruct_th"), f"{label}.deconstruct_th", errors)
        _check_field_translation(ov.get("example_translation_en"), tv.get("example_translation_th"), f"{label}.example_translation_th", errors)
    orig_grammar, new_grammar = original.get("grammar", []), translated.get("grammar", [])
    if len(orig_grammar) != len(new_grammar):
        return "grammar array length changed"
    for og, tg in zip(orig_grammar, new_grammar):
        label = f"grammar[{og.get('title')}]"
        _check_field_translation(og.get("explanation"), tg.get("explanation_th"), f"{label}.explanation_th", errors)
        orig_examples, new_examples = og.get("examples", []), tg.get("examples", [])
        if len(orig_examples) != len(new_examples):
            return f"{label}.examples array length changed"
        for oe, te in zip(orig_examples, new_examples):
            _check_field_translation(oe.get("en"), te.get("th"), f"{label}.examples.th", errors)
        o_prac, t_prac = og.get("practice") or {}, tg.get("practice") or {}
        _check_field_translation(o_prac.get("prompt"), t_prac.get("prompt_th"), f"{label}.practice.prompt_th", errors)
    orig_dial, new_dial = original.get("dialogue") or {}, translated.get("dialogue") or {}
    orig_lines, new_lines = orig_dial.get("lines", []), new_dial.get("lines", [])
    if len(orig_lines) != len(new_lines):
        return "dialogue.lines array length changed"
    for ol, tl in zip(orig_lines, new_lines):
        _check_field_translation(ol.get("en"), tl.get("th"), "dialogue.lines.th", errors)
    _check_field_translation(original.get("title"), translated.get("title_th"), "title_th", errors)
    return errors[0] if errors else None

def _strip_untranslatable_fields(data):
    """Create a deep copy with cn/py/character/pinyin removed entirely.
    These fields are never read back from the LLM response (see
    _apply_translated_fields), so they are never sent in the first place —
    nothing sent means nothing for the LLM to alter or mis-echo."""
    stripped = copy.deepcopy(data)

    for v in stripped.get("vocab", []):
        v.pop("character", None)
        v.pop("pinyin", None)

    for g in stripped.get("grammar", []):
        for ex in g.get("examples", []):
            ex.pop("cn", None)
            ex.pop("py", None)

    dial = stripped.get("dialogue")
    if dial:
        for line in dial.get("lines", []):
            line.pop("cn", None)
            line.pop("py", None)

    return stripped

def _apply_translated_fields(lesson_data, translated):
    lesson_data["title_th"] = translated.get("title_th", "")
    for orig_v, new_v in zip(lesson_data.get("vocab", []), translated.get("vocab", [])):
        orig_v["translation_th"] = new_v.get("translation_th", "")
        orig_v["deconstruct_th"] = new_v.get("deconstruct_th", "")
        orig_v["example_translation_th"] = new_v.get("example_translation_th", "")
    for orig_g, new_g in zip(lesson_data.get("grammar", []), translated.get("grammar", [])):
        orig_g["title_th"] = new_g.get("title_th", "")
        orig_g["explanation_th"] = new_g.get("explanation_th", "")
        for orig_ex, new_ex in zip(orig_g.get("examples", []), new_g.get("examples", [])):
            orig_ex["th"] = new_ex.get("th", "")
        if orig_g.get("practice") is not None:
            orig_g["practice"]["prompt_th"] = (new_g.get("practice") or {}).get("prompt_th", "")
    orig_dial = lesson_data.get("dialogue")
    new_dial = translated.get("dialogue") or {}
    if orig_dial:
        orig_dial["title_th"] = new_dial.get("title_th", "")
        for orig_line, new_line in zip(orig_dial.get("lines", []), new_dial.get("lines", [])):
            orig_line["th"] = new_line.get("th", "")

class QuotaExceededError(RuntimeError):
    """Raised when the Gemini API reports quota/rate-limit exhaustion (HTTP 429)
    twice in a row for the same lesson. Kept distinct from ordinary translation
    failures (bad JSON, corruption) so a batch runner can stop immediately and
    leave the remaining lessons untouched, instead of burning through retries
    and silently falling back to Google Translate for every lesson that follows."""
    pass

def add_thai_translations_to_lesson_llm(lesson_data, max_retries=3):
    if not lesson_data:
        return
    original = copy.deepcopy(lesson_data)
    stripped_lesson = _strip_untranslatable_fields(lesson_data)

    prompt = f"""
    You are a professional Chinese-to-Thai pedagogical translator for children
    aged 8-15 learning Chinese as a foreign language.

    Below is a full lesson JSON for a Chinese class. Translate every English
    field into natural, idiomatic, kid-friendly Thai and populate the matching
    "_th" field for each one (e.g. "meaning" -> "translation_th", "deconstruct"
    -> "deconstruct_th", "explanation" -> "explanation_th", "prompt" ->
    "prompt_th", "en" -> "th", "title" -> "title_th").

    STRICT RULES:
    - Do NOT translate word-for-byte; use natural spoken Thai grammar.
    - Explain grammar particles by their function in Thai, not their literal name.
    - Use simple, warm, kid-friendly language, not academic/formal register.
    - Any Chinese characters or pinyin cited inside an English field (e.g. '禾' (hé, grain))
      MUST be preserved byte-for-byte, identical, inside the translated Thai field.
    - Return the EXACT SAME JSON structure and field names as the input, with
      every "_th"/"th" field now filled in. Do NOT add, remove, or reorder any
      array items.
    - Output valid JSON only. No markdown code fences, no extra commentary.

    Lesson JSON:
    {json.dumps(stripped_lesson, ensure_ascii=False)}
    """

    consecutive_quota_errors = 0
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=TRANSLATION_MODEL, contents=prompt, config=TRANSLATION_CONFIG
            )
            finish_reason = response.candidates[0].finish_reason if response.candidates else None
            if finish_reason == types.FinishReason.MAX_TOKENS:
                raise ValueError("Response truncated (hit max_output_tokens) before completing JSON")
            text = (response.text or "").strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            try:
                translated = json.loads(text)
            except json.JSONDecodeError as e:
                snippet = text[max(0, e.pos - 40):e.pos + 40]
                print(f"  [Thai LLM translation] json.loads failed ({e}); "
                      f"near: {snippet!r}. Retrying with json_repair.")
                translated = json_repair.loads(text)
            corruption = find_translation_corruption(original, translated)
            if corruption:
                raise ValueError(f"Translation corruption detected: {corruption}")
            _apply_translated_fields(lesson_data, translated)
            lesson_data["_th_source"] = "llm"
            return
        except genai_errors.APIError as e:
            if e.code == 429:
                consecutive_quota_errors += 1
                if consecutive_quota_errors >= 2:
                    raise QuotaExceededError(
                        f"Gemini quota/rate limit hit twice in a row while translating "
                        f"'{original.get('id', original.get('title'))}': {e}"
                    ) from e
                print(f"  [Thai LLM translation attempt {attempt+1}/{max_retries}] "
                      f"quota/rate limit hit ({e}); backing off 60s before retry.")
                time.sleep(60)
                continue
            print(f"  [Thai LLM translation attempt {attempt+1}/{max_retries} failed] {e}")
            time.sleep(5)
        except Exception as e:
            consecutive_quota_errors = 0
            print(f"  [Thai LLM translation attempt {attempt+1}/{max_retries} failed] {e}")
            time.sleep(5)

    print(f"  [Thai LLM translation] All {max_retries} attempts failed for "
          f"'{original.get('id', original.get('title'))}'. Falling back to Google Translate.")
    add_thai_translations_to_lesson(lesson_data)
    lesson_data["_th_source"] = "fallback"

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

def contains_thai(text):
    return isinstance(text, str) and any('฀' <= ch <= '๿' for ch in text)

def find_thai_contamination(data):
    if contains_thai(data.get("title")):
        return "title"
    for v in data.get("vocab", []):
        if contains_thai(v.get("meaning")) or contains_thai(v.get("deconstruct")):
            return f"vocab[{v.get('character')}]"
    for g in data.get("grammar", []):
        if contains_thai(g.get("title")) or contains_thai(g.get("explanation")):
            return f"grammar[{g.get('title')}]"
    dialogue = data.get("dialogue", {})
    if contains_thai(dialogue.get("title")):
        return "dialogue.title"
    return None

def contains_chinese(text):
    return isinstance(text, str) and any('一' <= ch <= '鿿' for ch in text)

def find_incomplete_practice(data):
    for g in data.get("grammar", []):
        practice = g.get("practice")
        if not practice:
            continue
        words = practice.get("words") or []
        answer = practice.get("answer") or []
        prompt = practice.get("prompt", "")
        if not answer:
            return f"grammar[{g.get('title')}].practice.answer is empty"
        if not contains_chinese(prompt):
            return f"grammar[{g.get('title')}].practice.prompt has no embedded example sentence"
        if not all(a in words for a in answer):
            return f"grammar[{g.get('title')}].practice.answer contains a token not present in words"
    return None

def is_mostly_chinese(text, threshold=0.3):
    if not text:
        return False
    cjk = sum(1 for ch in text if '一' <= ch <= '鿿')
    alpha = sum(1 for ch in text if ch.isalpha() or '一' <= ch <= '鿿')
    return alpha > 0 and (cjk / alpha) > threshold

def find_chinese_field_contamination(data):
    for v in data.get("vocab", []):
        if is_mostly_chinese(v.get("deconstruct")):
            return f"vocab[{v.get('character')}].deconstruct"
    for g in data.get("grammar", []):
        if is_mostly_chinese(g.get("explanation")):
            return f"grammar[{g.get('title')}].explanation"
    return None

def generate_lesson_content(words_chunk, day_number, hsk_level="hsk2", theme_name=None):
    words_str = json.dumps(words_chunk, ensure_ascii=False)
    theme_instruction = f"The overall theme for this lesson should be around: '{theme_name}'." if theme_name else "You must create a highly engaging, thematic 4-stage Chinese lesson for these words."
    
    prompt = f"""
    You are an expert Chinese teacher. I will give you a list of Chinese vocabulary words.
    {theme_instruction}
    
    Vocabulary Words: {words_str}
    
    You MUST output valid JSON only, using the EXACT structure below. Do NOT use markdown code blocks or extra text.
    {{
        "title": "A thematic title for this lesson (e.g., 'At the Airport'). MUST be in English only. Do NOT include Chinese characters or pinyin.",
        "vocab": [
            {{
                "character": "...",
                "pinyin": "...",
                "meaning": "... MUST be in English only.",
                "translation_th": "Thai translation of the meaning",
                "deconstruct": "Explain the radicals/components briefly. MUST be written in English prose, do NOT write this in Thai or Chinese — you may cite individual Chinese characters/radicals in quotes (e.g. '禾' (hé, grain)) but the surrounding explanation must be English.",
                "example_sentence": "A simple example sentence using this word",
                "example_translation_en": "English for example",
                "example_translation_th": "Thai for example"
            }}
            // MUST return an entry for EVERY word in the provided list
        ],
        "grammar": [
            {{
                "title": "A grammar point utilizing some of the vocab",
                "explanation": "Clear explanation. MUST be written in English prose, do NOT write this in Thai or Chinese — you may cite Chinese words/particles in quotes but the surrounding explanation must be English.",
                "examples": [
                    {{"cn": "...", "py": "...", "en": "..."}},
                    {{"cn": "...", "py": "...", "en": "..."}}
                ],
                "practice": {{
                    "prompt": "MUST embed a complete example sentence in Chinese with the blank shown as '___', e.g. 'Fill in the blank: 今天天气___热。'. Do NOT write a generic instruction with no sentence. Do NOT add any parenthetical translation or hint anywhere in this field — not after the whole sentence, and NEVER attached to an individual blank (e.g. '你有 ___(two)___(个) 铅笔吗？' is forbidden because it spells out the answer for each blank). The student answers using the words list alone; no translation is needed.",
                    "words": ["word1", "word2"],
                    "answer": ["word1"] // MUST be non-empty and every element MUST also appear in "words", in the order needed to fill the blank(s).
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
    
    response = client.models.generate_content(
        model=GENERATION_MODEL, contents=prompt, config=JSON_CONFIG
    )
    try:
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError as e:
            snippet = response.text[max(0, e.pos - 40):e.pos + 40]
            print(f"Day {day_number}: json.loads failed ({e}); "
                  f"near: {snippet!r}. Retrying with json_repair.")
            data = json_repair.loads(response.text)
        for g in data.get("grammar", []):
            practice = g.get("practice")
            if practice and practice.get("prompt"):
                practice["prompt"] = _strip_practice_prompt_gloss(practice["prompt"])
        # Validation checks
        if "vocab" not in data or "grammar" not in data or "dialogue" not in data:
            raise ValueError("Missing core section (vocab, grammar, dialogue)")
        if len(data.get("grammar", [])) == 0:
            raise ValueError("Missing grammar points")
        for v in data.get("vocab", []):
            if "translation_th" not in v or "example_sentence" not in v:
                raise ValueError("Vocab missing translation_th or example_sentence")
        bad_field = find_thai_contamination(data)
        if bad_field:
            raise ValueError(f"Thai text leaked into English field: {bad_field}")
        bad_practice = find_incomplete_practice(data)
        if bad_practice:
            raise ValueError(f"Incomplete grammar practice: {bad_practice}")
        bad_chinese_field = find_chinese_field_contamination(data)
        if bad_chinese_field:
            raise ValueError(f"Chinese text leaked into English field: {bad_chinese_field}")
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
                        add_thai_translations_to_lesson_llm(lesson_data)
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
                        add_thai_translations_to_lesson_llm(lesson_data)
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
