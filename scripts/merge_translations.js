const fs = require('fs');
const path = require('path');

const OFFICIAL_DIR = path.resolve('c:/Users/lpfon/Downloads/foundryvtt-lancer/node_modules/@massif/lancer-data/lib');
const PT_BR_DIR = path.resolve('c:/Users/lpfon/Downloads/lancer-data-pt-br/lib');
const OUTPUT_DIR = path.resolve('c:/Users/lpfon/Downloads/lancer-data-pt-br/lib_merged');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TRANSLATABLE_KEYS = new Set([
    'name', 'description', 'flavor', 'notes', 
    'trigger', 'condition', 'detail', 'effect',
    'active_name', 'active_effect', 'passive_effect',
    'on_hit', 'on_crit', 'on_attack', 'terse'
]);

const ALT_KEYS = {
    'synergies': 'active_effects',
    'active_synergies': 'active_effects'
};

const NON_TRANSLATABLE_PATHS = new Set([
    'id', 'stats', 'damage', 'range', 'tags', 'bonuses', 
    'locations', 'source', 'license', 'license_level',
    'type', 'mechtype', 'y_pos', 'mounts', 'use', 'activation',
    'image_url', 'license_id', 'integrated', 'exclusive'
]);

function translateObject(official, ptBr) {
    if (!ptBr || typeof official !== 'object' || official === null) return official;

    if (Array.isArray(official)) {
        return official.map((item, i) => {
            if (typeof item !== 'object' || item === null) return item;
            
            // Try matching by ID first
            let ptItem;
            if (item.id) {
                ptItem = ptBr.find(p => p && p.id === item.id);
            }
            
            // If no ID match or no ID, use index (risky but often correct for ranks/actions)
            if (!ptItem) {
                ptItem = ptBr[i];
            }

            return translateObject(item, ptItem);
        });
    }

    const result = { ...official };
    for (const key in official) {
        if (NON_TRANSLATABLE_PATHS.has(key)) continue;

        if (TRANSLATABLE_KEYS.has(key)) {
            if (ptBr[key]) {
                result[key] = ptBr[key];
            }
        } else if (typeof official[key] === 'object' && official[key] !== null) {
            let ptSub = ptBr[key];
            if (!ptSub && ALT_KEYS[key]) {
                ptSub = ptBr[ALT_KEYS[key]];
            }
            result[key] = translateObject(official[key], ptSub);
        }
    }

    return result;
}

const filesToProcess = fs.readdirSync(OFFICIAL_DIR).filter(f => f.endsWith('.json'));

filesToProcess.forEach(filename => {
    const officialPath = path.join(OFFICIAL_DIR, filename);
    const ptBrPath = path.join(PT_BR_DIR, filename);
    const outputPath = path.join(OUTPUT_DIR, filename);

    console.log(`Processing ${filename}...`);

    const officialData = JSON.parse(fs.readFileSync(officialPath, 'utf8'));
    let ptBrData;
    if (fs.existsSync(ptBrPath)) {
        ptBrData = JSON.parse(fs.readFileSync(ptBrPath, 'utf8'));
    } else {
        console.warn(`  Warning: ${filename} not found in PT-BR dir. Copying official.`);
        fs.writeFileSync(outputPath, JSON.stringify(officialData, null, 2));
        return;
    }

    const mergedData = translateObject(officialData, ptBrData);
    fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2));
});


// Copy extra PT-BR files that don't exist in official
const ptBrFiles = fs.readdirSync(PT_BR_DIR).filter(f => f.endsWith('.json'));
ptBrFiles.forEach(filename => {
    const outputPath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(path.join(OFFICIAL_DIR, filename))) {
        console.log(`Copying extra PT-BR file: ${filename}`);
        fs.copyFileSync(path.join(PT_BR_DIR, filename), outputPath);
    }
});

console.log('Merge complete! Files saved to:', OUTPUT_DIR);
