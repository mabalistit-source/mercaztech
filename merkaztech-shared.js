// Shared constants + render helpers for the Merkaztech activity log pages.
// Field names mirror the columns of the "יומן פעילויות מרכזי" sheet in the source Excel workbook
// (and the public.activities table defined in supabase-schema.sql).

export const DOMAINS = [
  'הנדסת חשמל',
  'ביוטכנולוגיה',
  'הנדסת מכונות',
  'כללי',
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

export const ROOMS = [
  'חדר מחשבים ימני (121)',
  'חדר מחשבים שמאלי (123)',
  'חדר פרונטלי 1 (225)',
  'חדר פרונטלי 2 (222)',
  'אולם רב תכליתי',
  'מעבדת חשמל',
  'סדנת אלקטרוניקה',
  'מעבדת מכונות',
  'מעבדת מייקרס',
  'מעבדת ביוטכנולוגיה גדולה',
  'מעבדת ביוטכנולוגיה קטנה',
];

export const STAFF_NAMES = ['שרי', 'אורפז', 'בר', 'לנה', 'אולגה', 'שמעון א', 'שמעון ס', 'נעמי'];

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

// Sorts activities by date then start time — used both for initial loads and after realtime patches.
export function sortActivities(list) {
  return [...list].sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')));
}

// Merges a Supabase realtime postgres_changes payload into a local activities array.
export function applyRealtimeChange(list, payload) {
  if (payload.eventType === 'INSERT') {
    return sortActivities([...list.filter(x => x.id !== payload.new.id), payload.new]);
  }
  if (payload.eventType === 'UPDATE') {
    return sortActivities(list.map(x => (x.id === payload.new.id ? payload.new : x)));
  }
  if (payload.eventType === 'DELETE') {
    return list.filter(x => x.id !== payload.old.id);
  }
  return list;
}

// "HH:MM" strings compare correctly lexically for same-day ranges.
export function timeRangesOverlap(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) return false;
  return start1 < end2 && start2 < end1;
}

// Returns the activities that already occupy `room` on `date` during any part of
// [startTime, endTime), excluding `excludeId` (the activity being edited, if any).
export function findRoomConflicts(activities, { date, room, startTime, endTime, excludeId }) {
  if (!room || !date || !startTime || !endTime) return [];
  return activities.filter(a => (
    a.id !== excludeId
    && a.date === date
    && (a.space1_name === room || a.space2_name === room)
    && timeRangesOverlap(startTime, endTime, a.start_time, a.end_time)
  ));
}

// All of a room's bookings on a given date, sorted by start time — for showing
// "what's free / what's busy" before the person even tries to submit.
export function getRoomBookingsForDate(activities, room, date, excludeId) {
  return activities
    .filter(a => a.id !== excludeId && a.date === date && (a.space1_name === room || a.space2_name === room))
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
}

// Every weekly occurrence date from startDate through endDateInclusive (same weekday), as "YYYY-MM-DD" strings.
export function generateWeeklyDates(startDate, endDateInclusive) {
  const dates = [];
  let d = new Date(startDate + 'T00:00:00');
  const end = new Date(endDateInclusive + 'T00:00:00');
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

// Buckets a day's activities by room (an activity can occupy space1 and/or space2),
// sorted by start time within each room — used by the room-occupancy dashboard.
export function groupActivitiesByRoom(activities, rooms) {
  const byRoom = new Map(rooms.map(r => [r, []]));
  for (const a of activities) {
    for (const room of [a.space1_name, a.space2_name]) {
      if (room && byRoom.has(room)) byRoom.get(room).push(a);
    }
  }
  for (const list of byRoom.values()) {
    list.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }
  return byRoom;
}

const STATUS_LABEL = { past: 'התקיים', today: 'היום', upcoming: 'מתוכנן' };
const STATUS_TAG_CLASS = { past: 'tag-muted', today: 'tag-ok', upcoming: 'tag-info' };

// Renders one activity as an HTML card string.
// opts.editable: adds edit/delete buttons wired to data-id for the caller to bind click handlers.
export function renderActivityCard(id, a, opts = {}) {
  const status = getActivityStatus(a.date);
  const duration = computeDuration(a.start_time, a.end_time);
  const rooms = [a.space1_name, a.space2_name].filter(Boolean).map(escapeHtml).join(' + ');

  const students = (a.students_planned || a.students_actual)
    ? `${a.students_planned ?? '—'} מתוכננים${a.students_actual != null ? ` / ${a.students_actual} בפועל` : ''}`
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
        <span class="time-range">${escapeHtml(a.start_time || '')}${a.end_time ? '–' + escapeHtml(a.end_time) : ''}</span>
        ${duration ? `<span class="time-dur">${duration}</span>` : ''}
      </div>
      <span class="tag ${STATUS_TAG_CLASS[status]}">${STATUS_LABEL[status]}</span>
    </div>
    <div class="activity-title">${escapeHtml(a.school || 'ללא בית ספר')}</div>
    <div class="activity-sub">${escapeHtml(a.track_name || '')}${a.class_name ? ' · כיתה ' + escapeHtml(a.class_name) : ''}</div>
    <div class="tags">
      ${a.domain ? `<span class="tag tag-info">${escapeHtml(a.domain)}</span>` : ''}
      ${a.percent_group ? `<span class="tag tag-warn">${escapeHtml(a.percent_group === '0.65' ? '65%' : a.percent_group === '0.35' ? '35%' : a.percent_group)}</span>` : ''}
    </div>
    <div class="info-grid">
      ${rooms ? `<div class="info-cell"><div class="info-lbl">מרחב למידה</div><div class="info-val">${rooms}</div></div>` : ''}
      ${a.teacher ? `<div class="info-cell"><div class="info-lbl">מורה / איש קשר</div><div class="info-val">${escapeHtml(a.teacher)}</div></div>` : ''}
      ${students ? `<div class="info-cell"><div class="info-lbl">תלמידים</div><div class="info-val">${students}</div></div>` : ''}
      ${a.entered_by_name ? `<div class="info-cell"><div class="info-lbl">הוזן ע"י</div><div class="info-val">${escapeHtml(a.entered_by_name)}</div></div>` : ''}
    </div>
    ${a.notes ? `<div class="activity-notes">${escapeHtml(a.notes)}</div>` : ''}
    ${actionsHtml}
  </div>`;
}

// Downloads the full activity list as a .xlsx file with the same columns as the
// source "יומן פעילויות מרכזי" workbook, so it stays self-explanatory outside the app.
export async function exportActivitiesToExcel(activities, filename = 'יומן-פעילויות-מרכזי.xlsx') {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
  const sorted = sortActivities(activities);
  const rows = sorted.map((a, i) => ({
    'מספר': i + 1,
    'תאריך': a.date || '',
    'שעת התחלה': a.start_time || '',
    'שעת סיום': a.end_time || '',
    'משך': computeDuration(a.start_time, a.end_time),
    'תחום': a.domain || '',
    'בי"ס': a.school || '',
    'מגמה - שם': a.track_name || '',
    'מגמה - סמל': a.track_code || '',
    "65% / 35%": a.percent_group || '',
    'כיתה': a.class_name || '',
    'תלמידים מתוכנן': a.students_planned ?? '',
    'תלמידים בפועל': a.students_actual ?? '',
    'מורה/איש קשר': a.teacher || '',
    'מרחב למידה 1': a.space1_name || '',
    'מרחב למידה 2': a.space2_name || '',
    'הערות': a.notes || '',
    'הוזן ע"י': a.entered_by_name || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'יומן פעילויות');
  XLSX.writeFile(wb, filename);
}
