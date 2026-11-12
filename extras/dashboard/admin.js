import { esc } from './util.js';

// ---------- המיתוג: רק את זה משנים ----------
// צבעים בפורמט #RRGGBB. אם המשתמש נתן רק 2-3 צבעים: dark = הצבע הכהה של המותג, accent = צבע ההדגשה,
// ואת השאר אפשר להשאיר (הם ניטרליים ומתאימים כמעט לכל מותג).
const BRAND = {
  name: '',            // ריק = BRAND_NAME מ-wrangler.toml
  nameAccent: '',      // חלק שני של השם בצבע ההדגשה (לא חובה), למשל name: 'שלום', nameAccent: 'צ׳ט'
  font: 'Assistant',   // פונט מ-Google Fonts שתומך בעברית
  weightLight: 300,
  weightBold: 800,
  favicon: '',         // קישור מלא לאייקון (svg או png). ריק = בלי אייקון
  dark: '#2B3A4A',     // הפס העליון, כותרות וטקסט
  mid: '#5B7290',      // טקסט משני
  accent: '#6FD3C6',   // כפתורים, מתגים והדגשות
  bg: '#F1F4F7',       // רקע הדף
  line: '#DAE1E8',     // קווים ומסגרות
};

const SOURCE_LABEL = { comment: 'תגובה על פוסט/ריל', story: 'תגובה לסטורי', dm: 'הודעה פרטית' };
const STATUS_LABEL = { sent: 'נשלח', pending: 'בתור', sending: 'בשליחה', failed: 'נכשל' };
const MSG = {
  connected: 'החשבון חובר בהצלחה 🎉',
  added: 'החוק נוסף',
  saved: 'נשמר',
  deleted: 'החוק נמחק',
  disconnected: 'החשבון נותק',
  cancelled: 'החיבור בוטל',
  missing: 'חסרה מילת מפתח או הודעה',
  badurl: 'הקישור של הכפתור צריך להתחיל ב-https://',
};
// לשוניות הסינון: לפי איפה כותבים את המילה
const CATS = [['comment', 'פוסטים ורילס'], ['story', 'סטוריז'], ['dm', 'הודעות']];

const fmt = (n) => Number(n || 0).toLocaleString('he-IL');
const day = (t) => new Date(t * 1000).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
const ago = (t) => {
  const m = Math.max(0, Math.round((Date.now() / 1000 - t) / 60));
  if (m < 60) return m <= 1 ? 'עכשיו' : `לפני ${m} דק׳`;
  const h = Math.round(m / 60);
  return h < 24 ? `לפני ${h} ש׳` : day(t);
};
// קישורי התמונות של אינסטגרם פגים אחרי כמה ימים, אז תמונה שלא נטענה פשוט נעלמת
const thumbImg = (r) => (r.media_thumb ? `<img src="${esc(r.media_thumb)}" alt="" loading="lazy" onerror="this.remove()">` : '');
const where = (r) => (r.source === 'comment'
  ? (r.media_id ? r.media_label || 'ריל ספציפי' : 'כל הפוסטים והרילס')
  : r.source === 'story' ? 'כל הסטוריז' : 'כל ההודעות');

export function adminPage({ s, rules, recent, sentByRule, pending, media, mediaError, msg, env }) {
  const connected = Boolean(s.token);
  const name = BRAND.name || env?.BRAND_NAME || 'תגובה ← הודעה';
  const totalSent = Object.values(sentByRule).reduce((a, n) => a + Number(n || 0), 0);
  const activeRules = rules.filter((r) => r.active).length;
  const byCat = (c) => rules.filter((r) => r.source === c);
  const selected = rules[0];

  const toggleForm = (r, cls) => `<form method="post" class="inline"><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="${r.id}"><button class="${cls}" title="${r.active ? 'כיבוי' : 'הפעלה'}" aria-label="${r.active ? 'כיבוי' : 'הפעלה'}">${cls.startsWith('tog') ? '' : r.active ? 'כיבוי' : 'הפעלה'}</button></form>`;

  const row = (r) => {
    const words = r.keyword.split(',').map((w) => w.trim()).filter(Boolean);
    return `
      <div class="row ${r.active ? '' : 'off'} ${selected && r.id === selected.id ? 'sel' : ''}" data-id="${r.id}" tabindex="0">
        <span class="thumb">${thumbImg(r)}</span>
        <span class="kw">${esc(words[0])}${words.length > 1 ? ` <span class="more">+${words.length - 1}</span>` : ''}</span>
        <span class="where"><span class="chip c-${r.source}">${SOURCE_LABEL[r.source] || ''}</span> ${esc(where(r))}</span>
        <span class="num"><b>${fmt(sentByRule[r.id])}</b> נשלחו</span>
        ${toggleForm(r, `tog ${r.active ? '' : 'is-off'}`)}
      </div>`;
  };

  const detail = (r) => `
      <div class="detail" data-detail="${r.id}" ${selected && r.id === selected.id ? '' : 'hidden'}>
        <div class="big">${thumbImg(r)}</div>
        <div>
          <h2>${esc(r.keyword)}</h2>
          <div class="muted">${esc(SOURCE_LABEL[r.source] || '')} · ${esc(where(r))}</div>
          <div class="muted small">החוק נוצר ב-${day(r.created_at)}${r.active ? '' : ' · <span class="chip off">כבוי</span>'}</div>
        </div>
        <div class="stats"><div><b>${fmt(sentByRule[r.id])}</b>נשלחו</div></div>
        <div class="bubble"><span class="lbl">ההודעה בפרטי</span>${esc(r.message)}${r.button_url ? `<div><span class="btnchip">${esc(r.button_text)}</span> <bdi dir="ltr" class="url">${esc(r.button_url)}</bdi></div>` : ''}</div>
        ${r.public_reply ? `<div class="bubble pub"><span class="lbl">תגובה פומבית</span>${esc(r.public_reply)}</div>` : ''}
        <div class="actions">
          ${toggleForm(r, 'btn ghost')}
          <form method="post" class="inline"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${r.id}"><button class="btn ghost danger" onclick="return confirm('למחוק את החוק?')">מחיקה</button></form>
        </div>
      </div>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name + (BRAND.nameAccent || ''))}</title>
${BRAND.favicon ? `<link rel="icon" href="${esc(BRAND.favicon)}"><link rel="apple-touch-icon" href="${esc(BRAND.favicon)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(BRAND.font)}:wght@${BRAND.weightLight};${BRAND.weightBold}&display=swap" rel="stylesheet">
<style>
  :root {
    --dark: ${BRAND.dark}; --mid: ${BRAND.mid}; --accent: ${BRAND.accent}; --bg: ${BRAND.bg}; --line: ${BRAND.line};
    --soft: color-mix(in srgb, var(--line) 45%, var(--bg));
    --accent-soft: color-mix(in srgb, var(--accent) 18%, #fff);
    --accent-ink: color-mix(in srgb, var(--accent) 45%, #000);
    --on-dark: color-mix(in srgb, #fff 70%, var(--dark));
    --bad: #c0362c; --bad-soft: #fbe7e5; --warn: #b25e09; --warn-soft: #fdf0e1;
    --shadow: 0 10px 30px color-mix(in srgb, var(--dark) 9%, transparent);
    --light: ${BRAND.weightLight}; --bold: ${BRAND.weightBold};
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; background: var(--bg); color: var(--dark); font: var(--light) 16px/1.5 '${BRAND.font}', system-ui, sans-serif; }
  b, strong, h1, h2, label, .kw { font-weight: var(--bold); }
  button { font-family: inherit; cursor: pointer; }
  .wrap { max-width: 1320px; margin: 0 auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
  .hero { background: linear-gradient(135deg, var(--dark), color-mix(in srgb, var(--dark) 85%, #fff)); border-radius: 22px; color: #fff; padding: 14px 22px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; position: relative; overflow: hidden; box-shadow: 0 18px 40px color-mix(in srgb, var(--dark) 14%, transparent); }
  .hero::after { content: ""; position: absolute; width: 180px; height: 180px; border: 3px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius: 50%; left: -40px; top: -80px; pointer-events: none; }
  .hero h1 { margin: 0; font-size: 22px; white-space: nowrap; }
  .hero h1 em { font-style: normal; color: var(--accent); }
  .acct { font-size: 14px; color: var(--on-dark); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .acct a, .acct button { color: var(--on-dark); background: none; border: 0; font: inherit; text-decoration: underline; padding: 0; }
  .spacer { flex: 1; }
  .kpis { display: flex; gap: 8px; }
  .kpi { background: rgba(255,255,255,.1); border-radius: 14px; padding: 5px 14px; text-align: center; min-width: 78px; }
  .kpi b { display: block; font-size: 20px; line-height: 1.2; }
  .kpi small { font-size: 12px; color: var(--on-dark); }
  .kpi.wait b { color: #ffd59a; }
  .btn { display: inline-block; background: var(--accent); color: var(--dark); border: 0; border-radius: 99px; padding: 9px 18px; font-weight: var(--bold); font-size: 15px; text-decoration: none; }
  .btn.ghost { background: #fff; border: 1px solid var(--line); }
  .btn.danger { color: var(--bad); }
  .flash { background: var(--accent-soft); color: var(--accent-ink); border-radius: 14px; padding: 9px 16px; font-weight: var(--bold); }
  .err { color: var(--bad); font-size: 13px; }
  .card { background: #fff; border-radius: 22px; box-shadow: var(--shadow); }
  .lay { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 14px; }
  .list, .side { padding: 12px 14px; overflow: auto; }
  .filters { display: flex; gap: 6px; padding: 4px 2px 10px; flex-wrap: wrap; }
  .chip { display: inline-block; background: var(--soft); color: var(--mid); border-radius: 99px; padding: 2px 10px; font-size: 12px; font-weight: var(--light); white-space: nowrap; }
  .chip.t, .chip.c-comment { background: var(--accent-soft); color: var(--accent-ink); }
  .chip.c-story { background: #F3E8FA; color: #6b3a8a; }
  .chip.c-dm { background: #FFF1DE; color: #8a5300; }
  .chip.off { background: #f1f1f1; color: #888; }
  .filters button { border: 0; background: var(--soft); color: var(--mid); border-radius: 99px; padding: 5px 14px; font-size: 14px; }
  .filters button.on { background: var(--dark); color: #fff; font-weight: var(--bold); }
  .row { display: grid; grid-template-columns: 40px minmax(90px, .9fr) minmax(0, 2fr) 92px 44px; gap: 12px; align-items: center; padding: 7px 10px; border-radius: 14px; cursor: pointer; font-size: 14px; }
  .row:hover { background: var(--soft); }
  .row.sel { background: var(--accent-soft); }
  .row.off { opacity: .55; }
  .row .kw { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 15px; }
  .row .more { color: var(--mid); font-size: 12px; font-weight: var(--light); }
  .row .where { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--mid); }
  .row .num { color: var(--mid); white-space: nowrap; }
  .row .num b { color: var(--dark); }
  .thumb { width: 40px; height: 52px; border-radius: 9px; background: var(--soft); overflow: hidden; display: block; }
  .thumb img, .big img { width: 100%; height: 100%; object-fit: cover; display: block; }
  form.inline { margin: 0; display: inline; }
  .tog { width: 40px; height: 22px; border-radius: 99px; background: var(--accent); position: relative; border: 0; padding: 0; display: block; }
  .tog::after { content: ""; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 3px; left: 3px; transition: left .15s; }
  .tog.is-off { background: var(--line); }
  .tog.is-off::after { left: 21px; }
  .empty { color: var(--mid); padding: 10px; }
  .act { width: 100%; border-collapse: collapse; font-size: 14px; }
  .act td { padding: 8px 6px; border-bottom: 1px solid var(--soft); vertical-align: top; }
  .pill { display: inline-block; padding: 1px 10px; border-radius: 99px; font-size: 13px; white-space: nowrap; }
  .pill.ok { background: var(--accent-soft); color: var(--accent-ink); }
  .pill.bad { background: var(--bad-soft); color: var(--bad); }
  .pill.wait { background: var(--warn-soft); color: var(--warn); }
  .muted { color: var(--mid); font-size: 14px; }
  .small { font-size: 13px; }
  .detail { display: flex; flex-direction: column; gap: 12px; }
  .detail h2 { margin: 0; font-size: 20px; word-break: break-word; }
  .big { height: 200px; border-radius: 16px; background: var(--soft); overflow: hidden; }
  .big:empty { display: none; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; }
  .stats div { background: var(--soft); border-radius: 12px; padding: 6px 12px; color: var(--mid); font-size: 13px; }
  .stats b { display: block; font-size: 20px; color: var(--dark); }
  .bubble { background: var(--soft); border-radius: 16px; padding: 10px 14px; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
  .bubble.pub { background: #fff; border: 1px dashed var(--line); }
  .bubble .lbl { display: block; font-size: 12px; color: var(--mid); font-weight: var(--bold); white-space: normal; }
  .btnchip { display: inline-block; margin-top: 6px; background: #fff; border: 1px solid var(--line); border-radius: 99px; padding: 2px 12px; font-weight: var(--bold); white-space: nowrap; }
  .url { font-size: 12px; color: var(--mid); word-break: break-all; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  #addpanel h2 { margin: 0 0 4px; font-size: 20px; display: flex; justify-content: space-between; align-items: center; }
  #addpanel label { display: block; margin: 14px 0 6px; font-size: 15px; }
  .hint { color: var(--mid); font-size: 13px; font-weight: var(--light); }
  input[type=text], input[type=url], textarea { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 9px 12px; font: inherit; background: #fff; color: var(--dark); }
  textarea { min-height: 84px; resize: vertical; }
  .two { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; }
  .seg { display: flex; gap: 6px; flex-wrap: wrap; }
  .seg label { margin: 0 !important; font-weight: var(--light); }
  .seg input { display: none; }
  .seg span { display: inline-block; padding: 6px 14px; border: 1px solid var(--line); border-radius: 99px; cursor: pointer; background: #fff; font-size: 14px; }
  .seg input:checked + span { background: var(--dark); border-color: var(--dark); color: #fff; font-weight: var(--bold); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 6px; max-height: 280px; overflow-y: auto; padding: 2px; }
  .grid label { margin: 0 !important; position: relative; cursor: pointer; }
  .grid input { position: absolute; opacity: 0; }
  .grid img, .grid .all { width: 100%; aspect-ratio: 9/16; object-fit: cover; border-radius: 10px; border: 3px solid transparent; display: block; background: var(--soft); }
  .grid .all { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 13px; padding: 6px; background: var(--accent-soft); }
  .grid input:checked + img, .grid input:checked + .all { border-color: var(--accent); }
  .x { background: none; border: 0; font-size: 22px; color: var(--mid); }
  @media (min-width: 981px) {
    body { height: 100vh; overflow: hidden; }
    .wrap { height: 100vh; }
    .lay { flex: 1; min-height: 0; }
  }
  @media (max-width: 980px) {
    .lay { grid-template-columns: 1fr; }
    .kpis { width: 100%; }
    .kpi { flex: 1; min-width: 0; }
  }
  @media (max-width: 560px) {
    .wrap { padding: 12px; }
    .row { grid-template-columns: 40px minmax(0, 1fr) auto 44px; }
    .row .where { display: none; }
    .two { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <h1>${esc(name)}${BRAND.nameAccent ? `<em>${esc(BRAND.nameAccent)}</em>` : ''}</h1>
    <div class="acct">
      ${connected
        ? `<span class="chip t">מחובר</span> <bdi dir="ltr">@${esc(s.username)}</bdi> · <a href="/connect">חיבור מחדש</a> · <form method="post" class="inline"><input type="hidden" name="action" value="disconnect"><button onclick="return confirm('לנתק את החשבון?')">ניתוק</button></form>`
        : `<span class="chip off">לא מחובר</span> <a class="btn" href="/connect">חיבור אינסטגרם</a>`}
      ${s.token_error ? `<div class="err" style="color:#ffd59a">חידוש הטוקן נכשל: ${esc(s.token_error)}. כדאי להתחבר מחדש.</div>` : ''}
    </div>
    <div class="spacer"></div>
    <div class="kpis">
      <div class="kpi"><b>${fmt(totalSent)}</b><small>נשלחו</small></div>
      <div class="kpi"><b>${fmt(activeRules)}</b><small>חוקים פעילים</small></div>
      <div class="kpi ${pending ? 'wait' : ''}"><b>${fmt(pending)}</b><small>בתור</small></div>
    </div>
    <button class="btn" type="button" id="openadd">+ חוק חדש</button>
  </header>

  ${msg && MSG[msg] ? `<div class="flash">${MSG[msg]}</div>` : ''}

  <div class="lay">
    <section class="card list">
      <div class="filters" id="filters">
        <button type="button" class="on" data-f="all">הכל (${rules.length})</button>
        ${CATS.filter(([c]) => byCat(c).length).map(([c, label]) => `<button type="button" data-f="${c}">${label} (${byCat(c).length})</button>`).join('')}
        <button type="button" data-f="act">פעילות אחרונה</button>
      </div>
      <div data-pane="all">${rules.length ? rules.map(row).join('') : '<p class="empty">עוד אין חוקים. לוחצים על "חוק חדש" למעלה.</p>'}</div>
      ${CATS.map(([c]) => `<div data-pane="${c}" hidden>${byCat(c).map(row).join('')}</div>`).join('')}
      <div data-pane="act" hidden>
        ${recent.length ? `<table class="act">${recent.map((e) => `
          <tr>
            <td>${e.username ? '<bdi dir="ltr"><b>@' + esc(e.username) + '</b></bdi>' : '—'}<div class="muted small">${SOURCE_LABEL[e.source] || ''}</div></td>
            <td>${esc((e.incoming_text || '').slice(0, 80))}${e.error ? `<div class="err">${esc(e.error)}</div>` : ''}</td>
            <td><span class="pill ${e.status === 'sent' ? 'ok' : e.status === 'failed' ? 'bad' : 'wait'}">${STATUS_LABEL[e.status] || e.status}</span><div class="muted small">${ago(e.created_at)}</div></td>
          </tr>`).join('')}</table>` : '<p class="empty">עוד לא נשלחו הודעות.</p>'}
      </div>
    </section>

    <aside class="card side">
      <div id="details">${rules.length ? rules.map(detail).join('') : '<p class="empty">כאן יופיעו הפרטים של החוק שבוחרים ברשימה.</p>'}</div>

      <div id="addpanel" hidden>
        <h2>חוק חדש <button type="button" class="x" id="closeadd" aria-label="סגירה">×</button></h2>
        <form method="post" id="add">
          <input type="hidden" name="action" value="add">
          <label>איפה כותבים את המילה?</label>
          <div class="seg">
            ${['comment', 'story', 'dm'].map((v, i) => `<label><input type="radio" name="source" value="${v}" ${i === 0 ? 'checked' : ''}><span>${SOURCE_LABEL[v]}</span></label>`).join('')}
          </div>

          <label for="keyword">מילת המפתח <span class="hint">(למשל: פרומפט. כמה מילים? מפרידים בפסיק)</span></label>
          <input type="text" id="keyword" name="keyword" required autocomplete="off">

          <div data-only="comment">
            <label>על איזה פוסט או ריל?</label>
            ${mediaError ? `<div class="err">לא הצלחתי לטעון את הפוסטים: ${esc(mediaError)}</div>` : ''}
            <div class="grid">
              <label><input type="radio" name="media" value="" checked><div class="all">כל הפוסטים והרילס</div></label>
              ${media.map((m) => {
                const thumb = m.thumbnail_url || m.media_url || '';
                const label = (m.caption || '').slice(0, 60);
                return `<label title="${esc(label)}"><input type="radio" name="media" value="${esc(JSON.stringify([m.id, thumb, label]))}"><img src="${esc(thumb)}" alt="${esc(label)}" loading="lazy"></label>`;
              }).join('')}
            </div>
          </div>
          <div data-only="story">
            <p class="hint">יעבוד על כל סטורי: מי שעונה לסטורי עם המילה יקבל את ההודעה.</p>
          </div>

          <label for="message">ההודעה הפרטית שנשלחת <span class="hint">({username} יוחלף בשם המשתמש)</span></label>
          <textarea id="message" name="message" required placeholder="היי {username}! הנה הפרומפט שביקשת 👇"></textarea>

          <label>כפתור בהודעה <span class="hint">(לא חובה. במקום קישור ארוך, יופיע כפתור לחיץ מתחת להודעה)</span></label>
          <div class="two">
            <input type="text" name="button_text" maxlength="20" placeholder="טקסט הכפתור, למשל: לפרומפט 👈">
            <input type="url" name="button_url" placeholder="https://..." dir="ltr">
          </div>

          <div data-only="comment">
            <label for="public_reply">תגובה פומבית מתחת לתגובה שלו <span class="hint">(לא חובה. כמה נוסחים, אחד בכל שורה, ונבחר אחד באקראי)</span></label>
            <textarea id="public_reply" name="public_reply" placeholder="שלחתי לך בפרטי 💌&#10;בדוק/י את ההודעות 😉"></textarea>
          </div>

          <p><button class="btn">הוספה</button></p>
        </form>
      </div>
    </aside>
  </div>
</div>
<script>
  const form = document.getElementById('add');
  function sync() {
    const src = form.querySelector('input[name=source]:checked').value;
    form.querySelectorAll('[data-only]').forEach((el) => { el.hidden = el.dataset.only !== src; });
  }
  form.addEventListener('change', sync);
  sync();

  const details = document.getElementById('details');
  const addpanel = document.getElementById('addpanel');
  const side = document.querySelector('.side');
  function showAdd(on) {
    addpanel.hidden = !on;
    details.hidden = on;
    side.scrollTop = 0;
    if (window.innerWidth <= 980) side.scrollIntoView({ behavior: 'smooth' });
  }
  document.getElementById('openadd').onclick = () => showAdd(true);
  document.getElementById('closeadd').onclick = () => showAdd(false);
  if (!${rules.length}) showAdd(true);

  function select(id) {
    document.querySelectorAll('.row').forEach((r) => r.classList.toggle('sel', r.dataset.id === id));
    details.querySelectorAll('[data-detail]').forEach((d) => { d.hidden = d.dataset.detail !== id; });
    showAdd(false);
    if (window.innerWidth <= 980) side.scrollIntoView({ behavior: 'smooth' });
  }
  const list = document.querySelector('.list');
  list.addEventListener('click', (e) => {
    if (e.target.closest('form')) return;
    const row = e.target.closest('.row');
    if (row) select(row.dataset.id);
  });
  list.addEventListener('keydown', (e) => {
    const row = e.target.closest('.row');
    if (row && e.key === 'Enter') select(row.dataset.id);
  });

  document.getElementById('filters').addEventListener('click', (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('on', b === e.target));
    document.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== f; });
  });
</script>
</body>
</html>`;
}
