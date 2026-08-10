const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Replace .style.display = 'none'
code = code.replace(/([\w\.\(\)\'\"\-\[\]]+)\.style\.display\s*=\s*['"]none['"]/g, '$1.classList.add(\'hidden\')');

// Replace .style.display = 'block' or 'flex' or 'inline-block'
code = code.replace(/([\w\.\(\)\'\"\-\[\]]+)\.style\.display\s*=\s*['"](block|flex|inline-block)['"]/g, '$1.classList.remove(\'hidden\')');

// Replace conditional toggles: el.style.display = (el.style.display === 'none') ? 'block' : 'none';
// Just use a simpler regex or replace it manually if there are only a few.
code = code.replace(/el\.style\.display = \(el\.style\.display === 'none'\) \? 'block' : 'none';/g, "el.classList.toggle('hidden');");

// Specific instances
code = code.replace(/warningBanner\.style\.display = state\.hasTakenPlacementTest \? 'none' : 'flex';/g, 
  "state.hasTakenPlacementTest ? warningBanner.classList.add('hidden') : warningBanner.classList.remove('hidden');");

code = code.replace(/document\.getElementById\("auth-name"\)\.style\.display = isLogin \? "none" : "block";/g,
  "isLogin ? document.getElementById(\"auth-name\").classList.add('hidden') : document.getElementById(\"auth-name\").classList.remove('hidden');");

code = code.replace(/document\.getElementById\('pane-next-btn'\)\.style\.display = idx === timelineStages\.length - 1 \? 'none' : 'block';/g,
  "idx === timelineStages.length - 1 ? document.getElementById('pane-next-btn').classList.add('hidden') : document.getElementById('pane-next-btn').classList.remove('hidden');");

// Let's also check if there are any remaining `.style.display`
fs.writeFileSync('app.js', code);
console.log('Refactoring complete.');
