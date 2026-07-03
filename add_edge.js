const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('route.js') || file.endsWith('route.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const apiRoutes = walk('./src/app/api');
let count = 0;
apiRoutes.forEach(route => {
    let content = fs.readFileSync(route, 'utf-8');
    if (!content.includes("export const runtime = 'edge'")) {
        content = "export const runtime = 'edge';\n" + content;
        fs.writeFileSync(route, content);
        count++;
    }
});
console.log(`Added edge runtime config to ${count} API routes.`);
