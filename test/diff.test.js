const D = require('../lib/diff.js');
let pass = 0, fail = 0;
const eq = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}`);
  if (!ok) { console.log('    got ', JSON.stringify(g)); console.log('    want', JSON.stringify(w)); } };
const shape = rows => rows.map(r => r.type === 'gap' ? `gap${r.count}` : r.type[0] + ':' + r.text).join(' ');

console.log('identical / empty:');
eq('identical -> all context', D.diffStats(D.diffLines('a\nb\nc', 'a\nb\nc')), {added:0,removed:0,changed:0});
eq('both empty', D.diffLines('', ''), [{type:'ctx',text:'',aLine:1,bLine:1}]);
eq('trailing newline is not a change', D.diffStats(D.diffLines('a\nb', 'a\nb\n')), {added:0,removed:0,changed:0});

console.log('single-line edits:');
eq('middle line changed', shape(D.diffLines('a\nX\nc','a\nY\nc')), 'c:a d:X a:Y c:c');
eq('line added at end', shape(D.diffLines('a\nb','a\nb\nc')), 'c:a c:b a:c');
eq('line added at start', shape(D.diffLines('b\nc','a\nb\nc')), 'a:a c:b c:c');
eq('line removed', shape(D.diffLines('a\nb\nc','a\nc')), 'c:a d:b c:c');

console.log('line numbers:');
let r = D.diffLines('a\nX\nc', 'a\nY\nc');
eq('del keeps old lineno, no new', [r[1].aLine, r[1].bLine], [2, null]);
eq('add keeps new lineno, no old', [r[2].aLine, r[2].bLine], [null, 2]);
eq('trailing context renumbered', [r[3].aLine, r[3].bLine], [3, 3]);
r = D.diffLines('a\nb\nc', 'a\nX\nY\nb\nc');
eq('context after insert: a-line 2 -> b-line 4', [r[3].aLine, r[3].bLine], [2, 4]);

console.log('whole-text replace:');
eq('nothing in common', shape(D.diffLines('a\nb','x\ny')), 'd:a d:b a:x a:y');
eq('old empty -> all adds', shape(D.diffLines('', 'x\ny')), 'd: a:x a:y');
eq('new empty -> all dels', D.diffStats(D.diffLines('x\ny','')).added, 1);

console.log('collapse:');
const long = Array.from({length: 40}, (_, i) => 'line' + i);
const mod  = long.slice(); mod[20] = 'CHANGED';
const rows = D.diffLines(long.join('\n'), mod.join('\n'));
eq('full diff is 41 rows', rows.length, 41);
const col = D.collapse(rows, 2);
eq('collapsed is much shorter', col.length < 10, true);
eq('gap before and after', [col[0].type, col.at(-1).type], ['gap','gap']);
eq('the change survives collapse', col.some(x => x.text === 'CHANGED' && x.type === 'add'), true);
eq('2 lines of context each side', col.filter(x => x.type === 'ctx').length, 4);
eq('gap counts total the hidden lines', col.filter(x=>x.type==='gap').reduce((s,x)=>s+x.count,0), 41 - 6);

console.log('realistic prompt edit:');
const p1 = `TARGET WORD: "{{word}}"
CONTEXT: "{{context}}"

STEP 1 - ANALYZE:
- Domain of the text?
- Which sense is used?`;
const p2 = `TARGET WORD: "{{word}}"
CONTEXT: "{{context}}"

STEP 1 - ANALYZE:
- Domain/genre of the text?
- Which SPECIFIC sense is used?
- What register matches?`;
const pr = D.diffLines(p1, p2);
eq('2 removed, 3 added', D.diffStats(pr), {added:3, removed:2, changed:5});
eq('header lines untouched', pr.slice(0,4).every(x => x.type === 'ctx'), true);

console.log('adversarial:');
eq('lines that look like markers', shape(D.diffLines('+a\n-b', '+a\n-c')), 'c:+a d:-b a:-c');
eq('whitespace-only change is a change', D.diffStats(D.diffLines('a\n  b','a\nb')).changed, 2);
eq('unicode lines', shape(D.diffLines('රක්ත\nවගාව','රක්ත\nසංස්කෘතිය')), 'c:රක්ත d:වගාව a:සංස්කෘතිය');
eq('null input tolerated', D.diffLines(null, null).length, 1);
eq('duplicate lines align sanely', D.diffStats(D.diffLines('a\na\na','a\na')).changed, 1);

console.log('performance:');
const big1 = Array.from({length: 600}, (_, i) => 'l' + i).join('\n');
const big2 = Array.from({length: 600}, (_, i) => i === 300 ? 'CH' : 'l' + i).join('\n');
const t = Date.now(); D.diffLines(big1, big2); const ms = Date.now() - t;
eq(`600x600 in ${ms}ms (<500)`, ms < 500, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
