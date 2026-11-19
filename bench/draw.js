const fs = require('fs'), path = require('path');
// Draws the README banner and benchmark charts as SVG. Free. Update the numbers below when the README tables change.
//   node bench/draw.js assets
const out = process.argv[2];
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

// ---- banner (self-contained dark card, reads on both GitHub themes)
const stats = [['−29%', 'output tokens'], ['−29%', 'code lines'], ['−21%', 'time'], ['on par', 'quality, blind review']];
const W = 1200, H = 400, tw = 255, gap = 20, x0 = 60;
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="frugal: Claude Code that writes less. Against default Claude Code on Opus: output tokens −29%, code lines −29%, time −21%, quality on par in a blind review.">
<rect width="${W}" height="${H}" rx="20" fill="#141414"/>
<text x="${x0}" y="112" font-family="${MONO}" font-size="76" font-weight="700" fill="#efefef">frugal<tspan fill="#338ced">_</tspan></text>
<text x="${x0}" y="164" font-family="${FONT}" font-size="28" fill="#c4c4c4">Claude Code that writes less. Less code, fewer tokens, same quality.</text>
${stats.map(([v, l], i) => { const x = x0 + i * (tw + gap); return `<rect x="${x}" y="210" width="${tw}" height="120" rx="12" fill="#1f1f1f" stroke="#2e2e2e"/>
<text x="${x + 24}" y="270" font-family="${FONT}" font-size="46" font-weight="700" fill="${i < 3 ? '#338ced' : '#efefef'}">${v}</text>
<text x="${x + 24}" y="304" font-family="${FONT}" font-size="20" fill="#9c9c9c">${l}</text>`; }).join('\n')}
<text x="${x0}" y="368" font-family="${FONT}" font-size="18" fill="#8a8a8a">Median change per task against default Claude Code · Opus · 156 real sessions · 23 tasks · 39/39 checks passed</text>
</svg>`;
fs.writeFileSync(path.join(out, 'banner.svg'), banner);

// ---- chart: two panels of horizontal bars, frugal emphasised, others neutral
const panels = [
  ['Code lines written', 'total over 23 tasks, lower is better', [['Default Claude Code', 407], ['Ponytail', 287], ['Honey', 184], ['frugal', 183]], true],
  ['Ranked best in blind review', 'of 46 four-way comparisons, higher is better', [['frugal', 21], ['Default Claude Code', 16], ['Ponytail', 9], ['Honey', 0]], false],
];
const themes = { light: { text: '#191919', sub: '#666666', bar: '#b9b9b9', hi: '#257de0', axis: '#d9d9d9' }, dark: { text: '#efefef', sub: '#9c9c9c', bar: '#5c5c5c', hi: '#338ced', axis: '#3a3a3a' } };
for (const [name, c] of Object.entries(themes)) {
  const PW = 580, CW = 1200, label = 170, barMax = 300, rowH = 40, top = 70;
  const CH = top + 4 * rowH + 20;
  const body = panels.map(([title, sub, rows, showPct], p) => {
    const ox = p * (PW + 40);
    const max = rows[0][1];
    return `<text x="${ox}" y="24" font-family="${FONT}" font-size="20" font-weight="600" fill="${c.text}">${title}</text>
<text x="${ox}" y="48" font-family="${FONT}" font-size="15" fill="${c.sub}">${sub}</text>
<line x1="${ox + label}" y1="${top - 6}" x2="${ox + label}" y2="${top + 4 * rowH - 6}" stroke="${c.axis}"/>
${rows.map(([n, v], i) => { const y = top + i * rowH, w = Math.max(6, Math.round(v / max * barMax)), hi = n === 'frugal';
  const pct = i && showPct ? `(${Math.round((v / max - 1) * 100)}%)`.replace('-', '−') : '';
  return `<text x="${ox + label - 12}" y="${y + 19}" text-anchor="end" font-family="${FONT}" font-size="16" font-weight="${hi ? 700 : 400}" fill="${c.text}">${n}</text>
<path d="M${ox + label} ${y}h${w - 4}a4 4 0 0 1 4 4v20a4 4 0 0 1 -4 4h-${w - 4}z" fill="${hi ? c.hi : c.bar}"/>
<text x="${ox + label + w + 10}" y="${y + 19}" font-family="${FONT}" font-size="16" font-weight="${hi ? 700 : 400}" fill="${c.text}">${v.toLocaleString('en-US')}<tspan dx="8" fill="${c.sub}" font-weight="400">${pct}</tspan></text>`; }).join('\n')}`;
  }).join('\n');
  fs.writeFileSync(path.join(out, `benchmark-${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}" role="img" aria-label="Code lines written over 23 tasks: default Claude Code 407, Ponytail 287, Honey 184, frugal 183. Ranked best in a blind review, of 46 comparisons: frugal 21, default Claude Code 16, Ponytail 9, Honey 0.">\n${body}\n</svg>`);
}
