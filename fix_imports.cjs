const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importStatementStart = code.indexOf('import {');
const importStatementEnd = code.indexOf('} from "lucide-react";');
const importString = code.substring(importStatementStart + 8, importStatementEnd);

const imports = importString.split(',').map(s => s.trim()).filter(Boolean);
const uniqueImports = [...new Set(imports)];

code = code.substring(0, importStatementStart + 8) + '\n  ' + uniqueImports.join(',\n  ') + '\n' + code.substring(importStatementEnd);

fs.writeFileSync('src/App.tsx', code);
