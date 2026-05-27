const fs = require('fs');
const file = 'c:/Users/tmfrl/Downloads/Hackathon/SafeSpot_codeXperts/frontend/public/html/index.html';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Replace lines 88 to 100 (0-indexed) which correspond to 89 to 101.
lines.splice(88, 13,
'          <div class="flex flex-col gap-3 shrink-0 md:mb-1">',
'            <a href="https://www.cbc.ca/news/canada/british-columbia/bc-heat-dome-sudden-deaths-570-1.6122316" target="_blank" class="flex items-center gap-3 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 rounded-full pl-3 pr-4 py-2 transition-colors group">',
'              <span class="text-xs font-semibold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full w-[60px] text-center">CBC</span>',
'              <span class="text-neutral-300">B.C. Sudden Deaths (2021)</span>',
'              <i data-lucide="arrow-up-right" class="w-4 h-4 text-neutral-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i>',
'            </a>',
'            <a href="https://globalnews.ca/news/8896944/bc-heat-dome-coroners-report/" target="_blank" class="flex items-center gap-3 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 rounded-full pl-3 pr-4 py-2 transition-colors group">',
'              <span class="text-xs font-semibold bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full w-[60px] text-center">Global</span>',
'              <span class="text-neutral-300">Coroner Confirms 619 Dead</span>',
'              <i data-lucide="arrow-up-right" class="w-4 h-4 text-neutral-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i>',
'            </a>',
'          </div>'
);

fs.writeFileSync(file, lines.join('\n'));
console.log('Successfully replaced lines');
