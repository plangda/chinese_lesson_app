"""
Unit test for field masking/unmasking logic.
Tests the implementation WITHOUT calling the real Gemini API.
"""

import json
import copy
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_hsk_full import _mask_untranslatable_fields, _unmask_fields, find_translation_corruption

def test_masking_unmasking():
    """Test that masking hides fields and unmasking restores them correctly."""

    # Minimal lesson structure for testing
    lesson = {
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

    # Test 1: Masking removes original field names
    print("Test 1: Masking removes original field names")
    masked = _mask_untranslatable_fields(lesson)

    # Check vocab is masked
    assert "_character_masked" in masked["vocab"][0], "vocab character should be masked"
    assert "character" not in masked["vocab"][0], "vocab character should not exist"
    assert "_pinyin_masked" in masked["vocab"][0], "vocab pinyin should be masked"
    assert "pinyin" not in masked["vocab"][0], "vocab pinyin should not exist"

    # Check grammar examples are masked
    assert "_cn_masked" in masked["grammar"][0]["examples"][0], "grammar cn should be masked"
    assert "cn" not in masked["grammar"][0]["examples"][0], "grammar cn should not exist"
    assert "_py_masked" in masked["grammar"][0]["examples"][0], "grammar py should be masked"
    assert "py" not in masked["grammar"][0]["examples"][0], "grammar py should not exist"

    # Check dialogue lines are masked
    assert "_cn_masked" in masked["dialogue"]["lines"][0], "dialogue cn should be masked"
    assert "cn" not in masked["dialogue"]["lines"][0], "dialogue cn should not exist"
    assert "_py_masked" in masked["dialogue"]["lines"][0], "dialogue py should be masked"
    assert "py" not in masked["dialogue"]["lines"][0], "dialogue py should not exist"

    print("  [OK] All fields correctly masked")

    # Test 2: Unmasking restores original field names and values
    print("\nTest 2: Unmasking restores original fields")

    # Simulate LLM response: masked fields preserved, _th fields added
    llm_response = {
        "id": "hsk1_day4",
        "title": "Family Lesson",
        "title_th": "บทเรียนครอบครัว",  # LLM must provide this
        "vocab": [
            {
                "_character_masked": "的",
                "_pinyin_masked": "de",
                "meaning": "possessive particle",
                "translation_th": "อนุภาค ที่แสดงความเป็นเจ้าของ",
                "deconstruct": "radical + phonetic",
                "deconstruct_th": "หมวดนำ + เสียงอ่าน",
                "example_translation_en": "example",
                "example_translation_th": "ตัวอย่าง"
            }
        ],
        "grammar": [
            {
                "title": "Possession with 的",
                "explanation": "Used to show possession",
                "explanation_th": "ใช้แสดงการครอบครัว",
                "examples": [
                    {
                        "_cn_masked": "这是我的朋友。",
                        "_py_masked": "Zhè shì wǒ de péngyou.",
                        "en": "This is my friend.",
                        "th": "นี่คือเพื่อนของฉัน"
                    }
                ],
                "practice": {
                    "prompt": "Fill blank",
                    "prompt_th": "กรอกข้อมูลในช่องว่าง",
                    "words": [],
                    "answer": []
                }
            }
        ],
        "dialogue": {
            "title": "Family Dialog",
            "title_th": "บทสนทนาครอบครัว",
            "lines": [
                {
                    "_cn_masked": "你好",
                    "_py_masked": "Nǐ hǎo",
                    "en": "Hello",
                    "th": "สวัสดี"
                }
            ]
        }
    }

    unmasked = _unmask_fields(llm_response)

    # Check vocab is unmasked correctly
    assert unmasked["vocab"][0]["character"] == "的", "character should be restored"
    assert unmasked["vocab"][0]["pinyin"] == "de", "pinyin should be restored"
    assert "_character_masked" not in unmasked["vocab"][0], "masked name should be removed"
    assert "_pinyin_masked" not in unmasked["vocab"][0], "masked name should be removed"

    # Check grammar examples are unmasked correctly
    assert unmasked["grammar"][0]["examples"][0]["cn"] == "这是我的朋友。", "cn should be restored"
    assert unmasked["grammar"][0]["examples"][0]["py"] == "Zhè shì wǒ de péngyou.", "py should be restored"
    assert "_cn_masked" not in unmasked["grammar"][0]["examples"][0], "masked name should be removed"
    assert "_py_masked" not in unmasked["grammar"][0]["examples"][0], "masked name should be removed"

    # Check dialogue lines are unmasked correctly
    assert unmasked["dialogue"]["lines"][0]["cn"] == "你好", "dialogue cn should be restored"
    assert unmasked["dialogue"]["lines"][0]["py"] == "Nǐ hǎo", "dialogue py should be restored"
    assert "_cn_masked" not in unmasked["dialogue"]["lines"][0], "masked name should be removed"
    assert "_py_masked" not in unmasked["dialogue"]["lines"][0], "masked name should be removed"

    print("  [OK] All fields correctly unmasked with original values preserved")

    # Test 3: Validation passes when unmasked data is compared to original
    print("\nTest 3: Validation should pass with correctly unmasked data")

    corruption = find_translation_corruption(lesson, unmasked)
    assert corruption is None, f"Validation should pass but got: {corruption}"
    print("  [OK] Validation passed: no corruption detected")

    # Test 4: Validation fails if fields are altered
    print("\nTest 4: Validation correctly detects altered fields")

    corrupted_response = copy.deepcopy(unmasked)
    corrupted_response["vocab"][0]["character"] = "不同"  # Change the character

    corruption = find_translation_corruption(lesson, corrupted_response)
    assert corruption is not None and "character/pinyin" in corruption, f"Should detect character change, got: {corruption}"
    print("  [OK] Correctly detected character/pinyin alteration")

    print("\n" + "="*60)
    print("All tests passed! [OK] Field masking implementation is correct")
    print("="*60)

if __name__ == "__main__":
    test_masking_unmasking()
