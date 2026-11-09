// כוורת הידע — שכבת התקשורת עם Supabase (חדרים חיים). משותף למסך המקרן, לטלפון ולמנהל.
// הכול עובר דרך פונקציות שרת (RPC). אין כאן שום סוד: רק מפתח anon הציבורי מ-merkaztech-supabase.js.
import { loadSupabase, isConfigured } from './merkaztech-supabase.js';

export { isConfigured };

const HEB = {
  bad_pin: 'קוד המנהל (PIN) שגוי',
  pin_too_short: 'קוד המנהל חייב להכיל לפחות 4 תווים',
  no_room: 'לא נמצא חדר פעיל עם הקוד הזה',
  room_full: 'החדר מלא (עד 60 משתתפים)',
  bad_name: 'נא להזין שם פרטי או כינוי (עד 20 תווים)',
  no_player: 'החיבור נותק, נא להצטרף מחדש',
  no_team: 'המנחה עוד לא שייך אתכם לקבוצה',
  not_allowed: 'כרגע המנחה פותח את התאים',
  cell_not_open: 'התא עדיין לא נפתח'
};
export function hebError(e){
  const m = String((e && e.message) || e || '');
  for(const k in HEB) if(m.includes(k)) return HEB[k];
  if(/fetch|network|Failed|load/i.test(m)) return 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב';
  return 'משהו השתבש. נסו שוב';
}

let client = null;
async function sb(){
  if(client) return client;
  client = (await loadSupabase()).client;
  return client;
}
export async function rpc(name, args){
  const { data, error } = await (await sb()).rpc(name, args || {});
  if(error) throw new Error(error.message || error.code || 'rpc_error');
  return data;
}

// מאזין לשינויים בחדר: realtime + גיבוי בסקירה תקופתית. cb נקרא בלי פרמטרים (הלקוח טוען מחדש את המצב).
export async function watchRoom(code, cb, pollMs = 8000){
  code = String(code).toUpperCase();
  let alive = true, timer = null, wait = null;
  const kick = () => { clearTimeout(wait); wait = setTimeout(() => alive && cb(), 250); };
  const poll = () => { if(!alive) return; if(!document.hidden) cb(); timer = setTimeout(poll, pollMs); };
  let ch = null;
  try{
    const c = await sb();
    ch = c.channel('hive-' + code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hive_opened', filter: 'room_code=eq.' + code }, kick)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hive_rooms',  filter: 'code=eq.' + code }, kick)
      .subscribe();
  }catch(e){ /* ממשיכים עם הסקירה התקופתית בלבד */ }
  timer = setTimeout(poll, pollMs);
  const vis = () => { if(!document.hidden) kick(); };
  document.addEventListener('visibilitychange', vis);
  return () => {
    alive = false; clearTimeout(timer); clearTimeout(wait);
    document.removeEventListener('visibilitychange', vis);
    try{ if(ch) client.removeChannel(ch); }catch(e){}
  };
}

export const createRoom   = pin => rpc('hive_create_room', { p_pin: pin });
export const join         = (code, name) => rpc('hive_join', { p_code: code, p_name: name });
export const state        = player => rpc('hive_state', { p_player: player });
export const publicState  = code => rpc('hive_public_state', { p_code: code });
export const openCell     = (player, cell) => rpc('hive_open_cell', { p_player: player, p_cell: cell });
export const submitAnswer = (player, cell, answer) => rpc('hive_submit_answer', { p_player: player, p_cell: cell, p_answer: answer });

export const admin = (code, pin) => ({
  state:  () => rpc('hive_admin_state',      { p_code: code, p_pin: pin }),
  groups: (n, assign) => rpc('hive_admin_set_groups', { p_code: code, p_pin: pin, p_n: n, p_assign: assign }),
  move:   (player, team) => rpc('hive_admin_move',    { p_code: code, p_pin: pin, p_player: player, p_team: team }),
  kick:   player => rpc('hive_admin_kick',            { p_code: code, p_pin: pin, p_player: player }),
  mode:   (mode, closed) => rpc('hive_admin_mode',    { p_code: code, p_pin: pin, p_mode: mode, p_closed: closed }),
  open:   (cell, team) => rpc('hive_admin_open',      { p_code: code, p_pin: pin, p_cell: cell, p_team: team }),
  reset:  () => rpc('hive_admin_reset',               { p_code: code, p_pin: pin }),
  remove: () => rpc('hive_admin_delete_room',         { p_code: code, p_pin: pin })
});

// עזר: קישורים
export function joinUrl(code){
  return new URL('hive-play.html', location.href).href.split('?')[0] + '?room=' + encodeURIComponent(code);
}
export function projectorUrl(code){
  return new URL('merkaztech-hive.html', location.href).href.split('?')[0] + '?room=' + encodeURIComponent(code);
}
