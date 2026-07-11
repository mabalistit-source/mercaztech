// Shared constants + render helpers for the Merkaztech activity log pages.
// Field names mirror the columns of the "יומן פעילויות מרכזי" sheet in the source Excel workbook.

export const DOMAINS = [
  'הנדסת חשמל',
  'ביוטכנולוגיה',
  'הנדסת מכונות',
  'הנדסת מערכות',
  'מכטרוניקה',
  'כללי',
  'אחר',
];

export const TRACKS = [
  { code: '3220', name: 'מכונות / הנדסת מערכות' },
  { code: '3210', name: 'מערכות תעופה' },
  { code: '1010', name: 'תיב"מ' },
  { code: '1020', name: 'תחזוקת מערכות הנדסיות' },
  { code: '3310', name: 'בקרה ואנרגיה' },
  { code: '1610', name: 'ביוטכנולוגיה' },
  { code: '', name: 'אחר' },
];

export const PERCENT_GROUPS = [
  { value: '0.65', label: '65% (עדיפות 1)' },
  { value: '0.35', label: '35% (עדיפות 2)' },
  { value: 'לא נכלל', label: 'לא נכלל' },
];

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDateHe(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y}`;
}

export function getActivityStatus(dateStr) {
  if (!dateStr) return 'upcoming';
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return 'past';
  if (dateStr === today) return 'today';
  return 'upcoming';
}

export function computeDuration(startTime, endTime) {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return '';
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} דק'`;
  if (m === 0) return `${h} שע'`;
  return `${h} שע' ${m} דק'`;
}

const STATUS_LABEL = { past: 'התקיים', today: 'היום', upcoming: 'מתוכנן' };
const STATUS_TAG_CLASS = { past: 'tag-muted', today: 'tag-ok', upcoming: 'tag-info' };

// Renders one activity as an HTML card string.
// opts.editable: adds edit/delete buttons wired to data-id for the caller to bind click handlers.
export function renderActivityCard(id, a, opts = {}) {
  const status = getActivityStatus(a.date);
  const duration = computeDuration(a.startTime, a.endTime);
  const rooms = [
    a.space1Name ? `${escapeHtml(a.space1Name)}${a.space1Number ? ' ' + escapeHtml(a.space1Number) : ''}` : '',
    a.space2Name ? `${escapeHtml(a.space2Name)}${a.space2Number ? ' ' + escapeHtml(a.space2Number) : ''}` : '',
  ].filter(Boolean).join(' + ');

  const students = (a.studentsPlanned || a.studentsActual)
    ? `${a.studentsPlanned ?? '—'} מתוכננים${a.studentsActual != null ? ` / ${a.studentsActual} בפועל` : ''}`
    : '';

  const actionsHtml = opts.editable ? `
    <div class="card-actions">
      <button type="button" class="btn-icon" data-action="edit" data-id="${id}" title="עריכה">✏️</button>
      <button type="button" class="btn-icon btn-danger" data-action="delete" data-id="${id}" title="מחיקה">🗑️</button>
    </div>` : '';

  return `
  <div class="activity-card" data-id="${id}">
    <div class="activity-head">
      <div class="activity-time">
        <span class="time-range">${escapeHtml(a.startTime || '')}${a.endTime ? '–' + escapeHtml(a.endTime) : ''}</span>
        ${duration ? `<span class="time-dur">${duration}</span>` : ''}
      </div>
      <span class="tag ${STATUS_TAG_CLASS[status]}">${STATUS_LABEL[status]}</span>
    </div>
    <div class="activity-title">${escapeHtml(a.school || 'ללא בית ספר')}</div>
    <div class="activity-sub">${escapeHtml(a.trackName || '')}${a.className ? ' · כיתה ' + escapeHtml(a.className) : ''}</div>
    <div class="tags">
      ${a.domain ? `<span class="tag tag-info">${escapeHtml(a.domain)}</span>` : ''}
      ${a.percentGroup ? `<span class="tag tag-warn">${escapeHtml(a.percentGroup === '0.65' ? '65%' : a.percentGroup === '0.35' ? '35%' : a.percentGroup)}</span>` : ''}
    </div>
    <div class="info-grid">
      ${rooms ? `<div class="info-cell"><div class="info-lbl">מרחב למידה</div><div class="info-val">${rooms}</div></div>` : ''}
      ${a.teacher ? `<div class="info-cell"><div class="info-lbl">מורה / איש קשר</div><div class="info-val">${escapeHtml(a.teacher)}</div></div>` : ''}
      ${students ? `<div class="info-cell"><div class="info-lbl">תלמידים</div><div class="info-val">${students}</div></div>` : ''}
    </div>
    ${a.notes ? `<div class="activity-notes">${escapeHtml(a.notes)}</div>` : ''}
    ${actionsHtml}
  </div>`;
}

// Downloads the full activity list as a .xlsx file with the same columns as the
// source "יומן פעילויות מרכזי" workbook, so it stays self-explanatory outside the app.
export async function exportActivitiesToExcel(activities, filename = 'יומן-פעילויות-מרכזי.xlsx') {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
  const sorted = [...activities].sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')));
  const rows = sorted.map((a, i) => ({
    'מספר': i + 1,
    'תאריך': a.date || '',
    'שעת התחלה': a.startTime || '',
    'שעת סיום': a.endTime || '',
    'משך': computeDuration(a.startTime, a.endTime),
    'תחום': a.domain || '',
    'בי"ס': a.school || '',
    'מגמה - שם': a.trackName || '',
    'מגמה - סמל': a.trackCode || '',
    "65% / 35%": a.percentGroup || '',
    'כיתה': a.className || '',
    'תלמידים מתוכנן': a.studentsPlanned ?? '',
    'תלמידים בפועל': a.studentsActual ?? '',
    'מורה/איש קשר': a.teacher || '',
    'מרחב למידה 1 - שם': a.space1Name || '',
    "מרחב למידה 1 - מס'": a.space1Number || '',
    'מרחב למידה 2 - שם': a.space2Name || '',
    "מרחב למידה 2 - מס'": a.space2Number || '',
    'הערות': a.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'יומן פעילויות');
  XLSX.writeFile(wb, filename);
}
