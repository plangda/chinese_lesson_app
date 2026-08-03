"""
Unit test for the untranslatable-field stripping and corruption-detection logic.
Tests the implementation WITHOUT calling the real Gemini API.
"""

import copy
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_hsk_full import _strip_untranslatable_fields, find_translation_corruption, translate_en_to_th

def _make_lesson():
    return {
        "id": "hsk1_day4",
        "title": "Family Lesson",
        "vocab": [
            {
                "character": "的",
                "pinyin": "de",
                "meaning": "possessive particle",
                "translation_th": ""
            }
        ],
        "grammar": [
            {
                "title": "Possession with 的",
                "explanation": "Used to show possession",
                "explanation_th": "",
                "examples": [
                    {
                        "cn": "这是我的朋友。",
                        "py": "Zhè shì wǒ de péngyou.",
                        "en": "This is my friend.",
                        "th": ""
                    }
                ],
                "practice": {"prompt": "", "prompt_th": "", "words": [], "answer": []}
            }
        ],
        "dialogue": {
            "title": "Family Dialog",
            "title_th": "",
            "lines": [
                {
                    "cn": "你好",
                    "py": "Nǐ hǎo",
                    "en": "Hello",
                    "th": ""
                }
            ]
        }
    }

def test_stripping_removes_untranslatable_fields():
    """Stripping must remove character/pinyin/cn/py entirely so the LLM never sees them."""
    print("Test 1: Stripping removes untranslatable fields from the payload")
    lesson = _make_lesson()
    stripped = _strip_untranslatable_fields(lesson)

    assert "character" not in stripped["vocab"][0], "vocab character should be stripped"
    assert "pinyin" not in stripped["vocab"][0], "vocab pinyin should be stripped"
    assert "cn" not in stripped["grammar"][0]["examples"][0], "grammar cn should be stripped"
    assert "py" not in stripped["grammar"][0]["examples"][0], "grammar py should be stripped"
    assert "cn" not in stripped["dialogue"]["lines"][0], "dialogue cn should be stripped"
    assert "py" not in stripped["dialogue"]["lines"][0], "dialogue py should be stripped"

    # The original lesson object must be untouched (we deep-copy before stripping).
    assert lesson["vocab"][0]["character"] == "的", "original lesson must not be mutated"
    print("  [OK] Untranslatable fields stripped, original left untouched")

def test_stripping_does_not_affect_translatable_context():
    print("\nTest 2: Stripping leaves translation-relevant fields alone")
    lesson = _make_lesson()
    stripped = _strip_untranslatable_fields(lesson)

    assert stripped["vocab"][0]["meaning"] == "possessive particle"
    assert stripped["grammar"][0]["examples"][0]["en"] == "This is my friend."
    assert stripped["dialogue"]["lines"][0]["en"] == "Hello"
    print("  [OK] English/context fields preserved for translation")

def test_validation_passes_on_a_well_behaved_response():
    """A normal, well-behaved LLM response (no character/cn/py fields at all,
    since they were never sent) should pass validation."""
    print("\nTest 3: Validation passes on a well-behaved response")
    lesson = _make_lesson()
    response = {
        "id": "hsk1_day4",
        "title": "Family Lesson",
        "title_th": "บทเรียนครอบครัว",
        "vocab": [
            {
                "meaning": "possessive particle",
                "translation_th": "อนุภาคที่แสดงความเป็นเจ้าของ",
            }
        ],
        "grammar": [
            {
                "title": "Possession with 的",
                "explanation_th": "ใช้แสดงการครอบครอง",
                "examples": [{"th": "นี่คือเพื่อนของฉัน"}],
                "practice": {"prompt_th": ""}
            }
        ],
        "dialogue": {
            "title_th": "บทสนทนาครอบครัว",
            "lines": [{"th": "สวัสดี"}]
        }
    }

    corruption = find_translation_corruption(lesson, response)
    assert corruption is None, f"Validation should pass but got: {corruption}"
    print("  [OK] Validation passed: no corruption detected")

def test_validation_ignores_an_ideal_but_unnecessary_echo():
    """Even if the LLM (incorrectly, or helpfully) includes character/cn/py in its
    response, validation must not depend on it — those fields are never read back
    downstream, so their presence or absence must not affect the verdict."""
    print("\nTest 4: Validation is indifferent to an unrequested character/cn/py echo")
    lesson = _make_lesson()
    response = {
        "title_th": "บทเรียนครอบครัว",
        "vocab": [{"meaning": "possessive particle", "translation_th": "อนุภาคที่แสดงความเป็นเจ้าของ", "character": "不同"}],
        "grammar": [{
            "title": "Possession with 的",
            "explanation_th": "ใช้แสดงการครอบครอง",
            "examples": [{"th": "นี่คือเพื่อนของฉัน", "cn": "completely different sentence"}],
            "practice": {"prompt_th": ""}
        }],
        "dialogue": {"title_th": "บทสนทนาครอบครัว", "lines": [{"th": "สวัสดี", "cn": "something else"}]}
    }

    corruption = find_translation_corruption(lesson, response)
    assert corruption is None, (
        f"An LLM echoing back character/cn/py (even incorrectly) must not fail "
        f"validation, since those fields are never used downstream. Got: {corruption}"
    )
    print("  [OK] Validation correctly ignores fields that aren't consumed downstream")

def test_validation_catches_real_translation_defects():
    """Validation must still catch the things that actually matter: dropped
    citations, empty/untranslated _th fields, and array-length mismatches."""
    print("\nTest 5: Validation still catches real translation defects")
    lesson = _make_lesson()
    lesson["vocab"][0]["deconstruct"] = "Contains the radical '心' (xīn, heart)."

    # Missing citation in the Thai translation.
    bad_citation = {
        "title_th": "บทเรียนครอบครัว",
        "vocab": [{
            "meaning": "possessive particle",
            "translation_th": "อนุภาคที่แสดงความเป็นเจ้าของ",
            "deconstruct_th": "ไม่มีการอ้างอิงถึงตัวอักษรเลย",
        }],
        "grammar": [{
            "title": "Possession with 的",
            "explanation_th": "ใช้แสดงการครอบครอง",
            "examples": [{"th": "นี่คือเพื่อนของฉัน"}],
            "practice": {"prompt_th": ""}
        }],
        "dialogue": {"title_th": "บทสนทนาครอบครัว", "lines": [{"th": "สวัสดี"}]}
    }
    corruption = find_translation_corruption(lesson, bad_citation)
    assert corruption is not None and "citation" in corruption, (
        f"Should detect a dropped citation, got: {corruption}"
    )
    print("  [OK] Dropped citation detected")

    # Array length mismatch (a vocab item silently disappeared).
    short_vocab = copy.deepcopy(bad_citation)
    short_vocab["vocab"] = []
    corruption = find_translation_corruption(lesson, short_vocab)
    assert corruption == "vocab array length changed", f"Got: {corruption}"
    print("  [OK] Array length mismatch detected")

def test_translate_en_to_th_citemark_restoration():
    """Test placeholder creation and restoration across standard text, single citation,
    multi-digit citations, and legacy transliterated Thai strings."""
    print("\nTest 6: translate_en_to_th CITEMARK & __CIT_ restoration")

    # 1. Standard text (no citations)
    std_text = "Expressing possession using a clear grammatical structure."
    translated_std = translate_en_to_th(std_text)
    assert isinstance(translated_std, str) and len(translated_std) > 0, "Standard text should return translated string"
    assert "__CIT_" not in translated_std and "CITEMARK" not in translated_std, "No placeholders in standard text output"
    print("  [OK] Standard text handles cleanly without placeholders")

    # 2. Single citation (Index 0)
    single_cit_text = "In Chinese, '你好' (nǐ hǎo) means hello."
    translated_single = translate_en_to_th(single_cit_text)
    assert "'你好' (nǐ hǎo)" in translated_single, f"Single citation should be restored verbatim, got: {translated_single}"
    assert "__CIT_" not in translated_single, "Placeholder token should be replaced by original citation"
    print("  [OK] Single citation restored verbatim")

    # 3. Multi-digit citations & Legacy Transliterated Restoration Test
    from generate_hsk_full import _RESTORATION_PATTERN
    citations = ["'你好' (nǐ hǎo)"] + [f"'C_{i}' (py_{i})" for i in range(1, 15)]

    # Test clean multi-digit placeholder restoration
    raw_multi = "ใช้ __CIT_10__ เมื่อขอบคุณ และ __CIT_12__ เมื่อจากไป"
    def restore_fn(m):
        try:
            idx = int(m.group(1))
            return citations[idx] if 0 <= idx < len(citations) else m.group(0)
        except (ValueError, IndexError):
            return m.group(0)

    restored_multi = _RESTORATION_PATTERN.sub(restore_fn, raw_multi)
    assert "'C_10' (py_10)" in restored_multi, f"Multi-digit 10 should restore, got: {restored_multi}"
    assert "'C_12' (py_12)" in restored_multi, f"Multi-digit 12 should restore, got: {restored_multi}"
    print("  [OK] Multi-digit citations (Index 10, Index 12) restored cleanly")

    # Test legacy transliterated Thai placeholder restoration (e.g. ไซท์มาร์ก0, ไซต์มาร์ก10)
    raw_transliterated = "ในภาษาจีน ไซท์มาร์ก0 หมายถึงสวัสดี และ ไซต์มาร์ก10 หมายถึงขอบคุณ"
    restored_transliterated = _RESTORATION_PATTERN.sub(restore_fn, raw_transliterated)
    assert "'你好' (nǐ hǎo)" in restored_transliterated, "Legacy ไซท์มาร์ก0 should restore citation 0"
    assert "'C_10' (py_10)" in restored_transliterated, "Legacy ไซต์มาร์ก10 should restore citation 10"
    print("  [OK] Legacy transliterated Thai placeholders (ไซท์มาร์ก) successfully restored")

if __name__ == "__main__":
    test_stripping_removes_untranslatable_fields()
    test_stripping_does_not_affect_translatable_context()
    test_validation_passes_on_a_well_behaved_response()
    test_validation_ignores_an_ideal_but_unnecessary_echo()
    test_validation_catches_real_translation_defects()
    test_translate_en_to_th_citemark_restoration()

    print("\n" + "="*60)
    print("All tests passed! [OK] Strip-and-validate implementation is correct")
    print("="*60)
