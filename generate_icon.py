import os
from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGBA', (128, 128), (0,0,0,0))
draw = ImageDraw.Draw(img)
draw.ellipse((4, 4, 124, 124), fill='#ff5252')

font_path = 'C:/Windows/Fonts/msyh.ttc'
if os.path.exists(font_path):
    font = ImageFont.truetype(font_path, 72)
else:
    font = ImageFont.load_default()

try:
    draw.text((64, 64), '汉', font=font, fill='white', anchor='mm')
except Exception as e:
    print(f"Error drawing text: {e}")

img.save('favicon.png')
print("Successfully saved favicon.png")
