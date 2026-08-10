const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Regex to find elements with style="... display: none; ..."
// and add the hidden class to them.

// First, for elements that already have a class attribute and style="display: none;" (or similar)
html = html.replace(/class="([^"]*)"([^>]*)style="([^"]*)display:\s*none;?([^"]*)"/gi, (match, classes, middle, styleBefore, styleAfter) => {
    let newStyle = (styleBefore + styleAfter).trim();
    let styleAttr = newStyle.length > 0 ? ` style="${newStyle}"` : '';
    return `class="${classes} hidden"${middle}${styleAttr}`;
});

// Second, for elements that have style="display: none;" but NO class attribute before it.
// e.g. <div id="pretest-quiz-screen" style="display: none; text-align: left;">
html = html.replace(/<([a-zA-Z0-9-]+)([^>]*)style="([^"]*)display:\s*none;?([^"]*)"([^>]*)>/gi, (match, tag, before, styleBefore, styleAfter, after) => {
    // wait, what if the element now ALREADY has the hidden class from the first replace?
    if (match.includes('class=')) {
        return match; // skip, handled above or we'll mess it up.
    }
    let newStyle = (styleBefore + styleAfter).trim();
    let styleAttr = newStyle.length > 0 ? ` style="${newStyle}"` : '';
    return `<${tag}${before}class="hidden"${styleAttr}${after}>`;
});

// Let's run the first one again just in case style was BEFORE class attribute
html = html.replace(/style="([^"]*)display:\s*none;?([^"]*)"([^>]*)class="([^"]*)"/gi, (match, styleBefore, styleAfter, middle, classes) => {
    let newStyle = (styleBefore + styleAfter).trim();
    let styleAttr = newStyle.length > 0 ? `style="${newStyle}"` : '';
    return `${styleAttr}${middle}class="${classes} hidden"`;
});

fs.writeFileSync('index.html', html);
console.log("Fixed index.html inline displays.");
