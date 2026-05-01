const fs = require('fs');
const path = 'c:/Users/lpfon/Downloads/lancer-data-pt-br/lib_merged/frames.json';

const encodings = ['utf8', 'latin1', 'utf16le'];

encodings.forEach(enc => {
    try {
        const content = fs.readFileSync(path, enc);
        console.log(`--- Encoding: ${enc} ---`);
        console.log(content.substring(0, 500));
    } catch (e) {
        console.log(`--- Encoding: ${enc} Failed ---`);
    }
});
