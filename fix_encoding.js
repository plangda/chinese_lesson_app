const fs = require('fs');

// Read the raw buffer
const buf = fs.readFileSync('style.css');

// Find the start of the corrupted ANSI text.
// The ANSI text starts with `.hidden`, which is 0x2E 0x68 0x69 0x64 0x64 0x65 0x6E
// Let's search for '.hidden' in the buffer.
const ansiStr = ".hidden";
let corruptedIndex = -1;

for (let i = 0; i < buf.length - ansiStr.length; i++) {
    let match = true;
    for (let j = 0; j < ansiStr.length; j++) {
        if (buf[i + j] !== ansiStr.charCodeAt(j)) {
            match = false;
            break;
        }
    }
    if (match) {
        // Double check if the preceding byte is 0x00 (UTF-16) and this is NOT.
        // Actually, if we just find the sequence '.hidden' where it's 1-byte per char, that's our corruption.
        corruptedIndex = i;
        break;
    }
}

let validUtf16Buf = buf;
if (corruptedIndex !== -1) {
    validUtf16Buf = buf.slice(0, corruptedIndex);
}

// Convert the valid UTF-16 LE buffer to a standard JS string
let cssText = validUtf16Buf.toString('utf16le');

// Ensure there is a newline at the end
if (!cssText.endsWith('\n')) {
    cssText += '\n';
}

// Append our standard CSS rule
cssText += `
.hidden {
  display: none !important;
}
`;

// Write the entire file back out as standard UTF-8!
// This fixes the file encoding forever.
fs.writeFileSync('style.css', cssText, 'utf8');

console.log("Encoding fixed! style.css is now standard UTF-8.");
