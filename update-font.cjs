const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = `@import url('https://fonts.maateen.me/solaiman-lipi/font.css');\n` + css;

css = css.replace(/--font-sans: "Nunito"/g, '--font-sans: "SolaimanLipi", "Nunito"');
css = css.replace(/--font-display: "Playfair Display"/g, '--font-display: "SolaimanLipi", "Playfair Display"');

fs.writeFileSync('src/index.css', css);
console.log('Font updated');
