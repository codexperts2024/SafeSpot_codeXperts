const fs = require('fs');

let html = fs.readFileSync('./public/html/index.html', 'utf8');

const startStr = 'document.addEventListener("DOMContentLoaded", function() {';
const endStr = '// -------------------------------------------------------------\n    // Geolocation: auto on load + click to refresh';

const startIndex = html.indexOf(startStr);
const endIndex = html.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    let scriptBody = html.substring(startIndex + startStr.length, endIndex);
    // remove the trailing '});\n\n    ' from the scriptBody
    scriptBody = scriptBody.replace(/\}\);\s*$/, '');
    
    let pageJs = fs.readFileSync('./app/page.js', 'utf8');
    
    // First, remove the bad script injected previously.
    // It starts at '    // Extracted DOMContentLoaded scripts:'
    // and ends before '  }, []);\n\n  const requestUserLocation'
    const badStart = pageJs.indexOf('    // Extracted DOMContentLoaded scripts:');
    const badEnd = pageJs.indexOf('  }, []);\n\n  const requestUserLocation');
    
    if (badStart !== -1 && badEnd !== -1) {
        const before = pageJs.substring(0, badStart);
        const after = pageJs.substring(badEnd);
        
        pageJs = before + '    // Extracted DOMContentLoaded scripts:\n' + scriptBody + '\n' + after;
        
        fs.writeFileSync('./app/page.js', pageJs);
        console.log("Successfully replaced script body.");
    } else {
        console.log("Could not find the bounds in page.js");
    }
} else {
    console.log("Could not find the script bounds in index.html");
}
