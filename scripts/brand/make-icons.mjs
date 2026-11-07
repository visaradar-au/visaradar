// Renders the PNG icons and the social card from the SVG mark: `node scripts/brand/make-icons.mjs`.
// Uses the Playwright Chromium already installed for the e2e tests; no image library needed.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const mark = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');
const sans = `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const serif = `'Iowan Old Style', 'Palatino Linotype', Charter, Georgia, serif`;

const icon = (size, pad = 0) => `<!doctype html><html><body style="margin:0;background:transparent">
  <div style="width:${size}px;height:${size}px;padding:${pad}px;box-sizing:border-box;background:${pad ? '#0c3b38' : 'transparent'}">${mark.replace('<svg ', `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `)}</div></body></html>`;

// Rings drawn from the card's right edge, echoing the mark.
const rings = [120, 220, 320, 420].map((r, i) => `<circle cx="1010" cy="315" r="${r}" stroke="#5fd0c2" stroke-opacity="${0.28 - i * 0.05}" stroke-width="2"/>`).join('');
const og = `<!doctype html><html><body style="margin:0">
<div style="position:relative;width:1200px;height:630px;overflow:hidden;background:radial-gradient(120% 140% at 85% 50%, #114a46 0%, #0c3b38 45%, #08292a 100%);font-family:${sans};color:#ecf6f4">
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" style="position:absolute;inset:0">
    <defs><linearGradient id="w" gradientUnits="userSpaceOnUse" x1="900" y1="0" x2="1200" y2="200"><stop offset="0" stop-color="#5fd0c2" stop-opacity="0"/><stop offset="1" stop-color="#5fd0c2" stop-opacity="0.35"/></linearGradient></defs>
    ${rings}
    <path d="M1010 315 L937 -98 A420 420 0 0 1 1332 45 Z" fill="url(#w)"/>
    <path d="M1010 315 L1332 45" stroke="#9be5da" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round"/>
    <circle cx="1120" cy="160" r="12" fill="#f0b44c"/><circle cx="1120" cy="160" r="26" stroke="#f0b44c" stroke-opacity="0.4" stroke-width="2"/>
  </svg>
  <div style="position:absolute;left:80px;top:88px;display:flex;align-items:center;gap:24px">
    ${mark.replace('<svg ', '<svg width="96" height="96" ')}
    <div style="font-size:64px;font-weight:750;letter-spacing:-1px">Visa<span style="color:#5fd0c2">Radar</span></div>
  </div>
  <div style="position:absolute;left:80px;top:240px;width:860px;font-family:${serif};font-size:54px;line-height:1.15;font-weight:600">Australian skilled migration, by the official numbers</div>
  <div style="position:absolute;left:80px;top:440px;width:760px;font-size:26px;line-height:1.4;color:#c3dcd8">EOI pool, state programs, invitation rounds and dated news. Every figure links to its source.</div>
  <div style="position:absolute;left:80px;bottom:56px;font-size:20px;color:#9fc4bf">Independent. Not a government site. Not migration advice.</div>
</div></body></html>`;

const browser = await chromium.launch();
const shoot = async (html, w, h, out, transparent = false) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  writeFileSync(new URL(`../../public/${out}`, import.meta.url), await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } }));
  await page.close();
};
// iOS masks its own corners, so the touch icon is a full-bleed tile.
await shoot(icon(180, 18), 180, 180, 'apple-touch-icon.png');
await shoot(icon(192), 192, 192, 'icon-192.png', true);
// RSS 2.0 caps channel images at 144 px wide.
await shoot(icon(144, 14), 144, 144, 'rss-icon.png');
await shoot(icon(512), 512, 512, 'icon-512.png', true);
await shoot(icon(512, 56), 512, 512, 'icon-maskable-512.png');
await shoot(og, 1200, 630, 'og-image.png');
await browser.close();
console.log('Wrote public/apple-touch-icon.png, icon-192.png, rss-icon.png, icon-512.png, icon-maskable-512.png, og-image.png');
