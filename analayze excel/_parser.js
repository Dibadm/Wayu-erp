const fs = require('fs');

function loadStrings(dir) {
  const ssXml = fs.readFileSync(dir + '/xl/sharedStrings.xml', 'utf8');
  const strings = [];
  let m, re = /<si>([\s\S]*?)<\/si>/g;
  while ((m = re.exec(ssXml))) {
    let t = '', tm, tr = /<t[^>]*>([\s\S]*?)<\/t>/g;
    while ((tm = tr.exec(m[1]))) t += tm[1];
    strings.push(t);
  }
  return strings;
}

function dumpSheet(dir, name, file, opts) {
  opts = opts || {};
  const strings = loadStrings(dir);
  const xml = fs.readFileSync(dir + '/xl/worksheets/' + file, 'utf8');
  console.log('\n================ SHEET: ' + name + ' (' + file + ') ================');
  const rows = {};
  let rm, rre = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  while ((rm = rre.exec(xml))) {
    const r = rm[1];
    const body = rm[2];
    let cm, cre = /<c r="([A-Z]+\d+)"(?:\s+t="(\w+)")?[^>]*>([\s\S]*?)<\/c>/g;
    const cells = [];
    while ((cm = cre.exec(body))) {
      const ref = cm[1];
      const t = cm[2] || 'n';
      const val = cm[3];
      let v = '', f = null;
      const vm = /<v>([\s\S]*?)<\/v>/.exec(val); if (vm) v = vm[1];
      const fm = /<f>([\s\S]*?)<\/f>/.exec(val); if (fm) f = fm[1];
      if (t === 's') v = strings[parseInt(v)] !== undefined ? strings[parseInt(v)] : v;
      cells.push({ ref, t, v: (v || '').toString().slice(0, 60), f });
    }
    rows[r] = cells;
  }
  const rnums = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const max = opts.max || 14;
  const only = opts.rows; // optional array of row numbers
  for (const r of rnums) {
    if (r > max && !(only && only.includes(r))) continue;
    if (only && !only.includes(r)) continue;
    const cells = rows[r];
    const line = cells.map(c => c.ref + '=' + (c.f ? ('F[' + c.f + ']') : c.v)).join(' | ');
    console.log('R' + r + ': ' + line.slice(0, 2200));
  }
}

module.exports = { dumpSheet, loadStrings };
