const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const iconsToAdd = ['Flame', 'Zap', 'Trophy', 'Lock', 'ChevronDown', 'Sun', 'Moon', 'LogOut', 'Camera', 'User', 'Heart'];
const importRegex = /import\s+\{([^}]+)\}\s+from\s+[\"']lucide-react[\"'];/;
const match = code.match(importRegex);
if(match) {
    let existingIcons = match[1].split(',').map(i => i.trim());
    iconsToAdd.forEach(icon => {
        if(!existingIcons.includes(icon) && !existingIcons.some(e => e.includes(icon + ' '))) {
            existingIcons.push(icon);
        }
    });
    code = code.replace(importRegex, 'import {\n  ' + existingIcons.join(',\n  ') + '\n} from \"lucide-react\";');
    fs.writeFileSync('src/App.tsx', code);
    console.log('Icons updated successfully');
}
