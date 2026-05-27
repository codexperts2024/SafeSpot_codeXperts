const fs = require('fs');
let html = fs.readFileSync('./public/html/index.html', 'utf8');

const scriptMatch = html.match(/document\.addEventListener\("DOMContentLoaded", function\(\) \{([\s\S]*?)\}\);/);
if (scriptMatch) {
    let scriptBody = scriptMatch[1];
    let pageJs = fs.readFileSync('./app/page.js', 'utf8');
    
    // Replace the empty useEffect body with the extracted script body
    pageJs = pageJs.replace(/useEffect\(\(\) => \{\s*\/\/ Lucide icons\s*if \(typeof window !== 'undefined' && window\.lucide\) \{\s*window\.lucide\.createIcons\(\);\s*\}\s*\}, \[\]\);/g, 
    `useEffect(() => {
    // Lucide icons
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }
    
    // Extracted DOMContentLoaded scripts:
    ${scriptBody.replace(/\$/g, '$$$$')}
  }, []);`);

    fs.writeFileSync('./app/page.js', pageJs);
    console.log("Fixed missing scripts");
} else {
    console.log("Could not find the DOMContentLoaded block");
}
