const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string; theme: any }> = {',
  'const MODES: Record<Mode, { label: string; icon: any; category: string; prompt: string; theme: any; image: string }> = {'
);


code = code.replace(
  /ROMANTIC:\s*\{([\s\S]*?theme:\s*\{[\s\S]*?\})\s*\}/,
  'ROMANTIC: {\n$1\n    ,\n    image: "https://images.unsplash.com/photo-1518199268839-496c4df2d18f?auto=format&fit=crop&q=80&w=400&h=400"\n  }'
);

code = code.replace(
  /FUN:\s*\{([\s\S]*?theme:\s*\{[\s\S]*?\})\s*\}/,
  'FUN: {\n$1\n    ,\n    image: "https://images.unsplash.com/photo-1545665277-50b91cb3feeb?auto=format&fit=crop&q=80&w=400&h=400"\n  }'
);

code = code.replace(
  /PHILOSOPHER:\s*\{([\s\S]*?theme:\s*\{[\s\S]*?\})\s*\}/,
  'PHILOSOPHER: {\n$1\n    ,\n    image: "https://images.unsplash.com/photo-1478059425650-dd1506458fe3?auto=format&fit=crop&q=80&w=400&h=400"\n  }'
);

code = code.replace(
  /POET:\s*\{([\s\S]*?theme:\s*\{[\s\S]*?\})\s*\}/,
  'POET: {\n$1\n    ,\n    image: "https://images.unsplash.com/photo-1455390582262-044cdead27d8?auto=format&fit=crop&q=80&w=400&h=400"\n  }'
);

code = code.replace(
  /SCIENTIST:\s*\{([\s\S]*?theme:\s*\{[\s\S]*?\})\s*\}/,
  'SCIENTIST: {\n$1\n    ,\n    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=400&h=400"\n  }'
);

fs.writeFileSync('src/App.tsx', code);
