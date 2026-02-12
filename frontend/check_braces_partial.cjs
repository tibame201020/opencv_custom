const fs = require('fs');
const content = fs.readFileSync('c:/Users/jeffh/Downloads/develop/codes/opencv_custom/frontend/src/views/WorkflowView.tsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < 1018; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
    }
}
console.log(`Counts at line 1018: Brace=${braceCount}, Paren=${parenCount}, Bracket=${bracketCount}`);
