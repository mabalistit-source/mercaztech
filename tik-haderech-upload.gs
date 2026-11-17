/**
 * תכנית מהנדסת – סקריפט העלאה (תמונות + תוצרים אישיים) לגוגל דרייב (Google Apps Script)
 * מאפשר לבנות להעלות תמונות וחומרים מהאפליקציה בלי להתחבר לחשבון גוגל.
 * הקבצים נשמרים בתיקיית המפגש בדרייב של שרי.
 *
 * פריסה: script.google.com ← פרויקט חדש ← הדבקת הקוד ← Deploy ← New deployment
 *   סוג: Web app | Execute as: Me | Who has access: Anyone
 * את כתובת ה-Web App מדביקים ב-UPLOAD_URL בקובץ tik-haderech.html.
 */

// רק תיקיות המפגשים מותרות להעלאה
const ALLOWED = [
  '1NSGU9VCmxROAg9km7O24-PO5M9elPTy0', // 1
  '1h1ae_Loqfi7e0_72ZyEnwd-xfV2uY5Jd', // 2
  '1IjDQ0hPeGD23W2cL7F8ljHVR7_ijPiOq', // 3
  '1TkKa6VFexJt5BM3gIivT90WQwjk6J5qK', // 4
  '18GYKkuN7muQbmB8U4pICrfzU9ZG550zW', // 5
  '1Ou61Cg6heQEyi4V-z2mDI31iSpnh3uoC', // 6
  '19ymIc1ypesmd2z7lRlHaRkNx0ymtMV-L', // 7
  '1-yhfCyNIDB84BTS7u1YlFTLoCk-WFDkg', // 8
  '13NavlUVD9aMDPADpqgbvjnRdksAZXegR', // 9
  '1QrIDAdCOOhRJVX1uDmvX-LoQNlTgsMfA', // 10
];
const ROOT = '1zuZJ3mG2hIUePfL6T_dCihX3iJQeBGUn'; // תכנית מהנדסת – תמונות וחומרים
const MAX_BYTES = 20 * 1024 * 1024;

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (ALLOWED.indexOf(p.folderId) === -1) return out({ ok: false, error: 'folder' });
    const bytes = Utilities.base64Decode(p.data);
    if (bytes.length > MAX_BYTES) return out({ ok: false, error: 'size' });
    const name = String(p.name || 'file').replace(/[\\/:*?"<>|]/g, '').slice(0, 150);
    let folder = DriveApp.getFolderById(p.folderId);
    // תוצרים אישיים: תכנית מהנדסת / תיקים אישיים / <שם הבת>
    if (p.kind === 'product') {
      const student = String(p.student || '').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60);
      if (!student) return out({ ok: false, error: 'name' });
      folder = sub(sub(DriveApp.getFolderById(ROOT), 'תיקים אישיים'), student);
    }
    const file = folder.createFile(Utilities.newBlob(bytes, p.mime || 'application/octet-stream', name));
    return out({ ok: true, id: file.getId() });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function sub(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function doGet() { return out({ ok: true, service: 'tik-haderech-upload' }); }

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
