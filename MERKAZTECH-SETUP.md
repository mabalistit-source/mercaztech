# הגדרת יומן הפעילויות המרכזי (מרכזטק)

המערכת מורכבת משני דפים סטטיים שרצים על GitHub Pages בדיוק כמו שאר האתר:

- **merkaztech-log.html** – תצוגה חיה וציבורית של היומן (לכל מי שיש לו את הקישור).
- **merkaztech-entry.html** – טופס הזנה/עריכה/מחיקה, מוגן בהתחברות, לצוות בלבד.

שני הדפים משתפים נתונים בזמן אמת דרך **Firebase** (שכבת ענן חינמית של גוגל). כדי שהמערכת תעבוד צריך להשלים הקמה חד-פעמית של כ-10 דקות:

## 1. יצירת פרויקט Firebase
1. גשו ל-https://console.firebase.google.com ובחרו **Add project**.
2. תנו שם לפרויקט (למשל `merkaztech-yoman`) ולחצו Continue עד שהפרויקט נוצר.
3. בתפריט הצד: **Build → Firestore Database → Create database**. בחרו מיקום (למשל `eur3`) ומצב **Production**.

## 2. יצירת אפליקציית Web וקבלת מפתחות
1. בעמוד הראשי של הפרויקט לחצו על סמל ה-Web `</>`.
2. תנו כינוי לאפליקציה (למשל `yoman-web`) ולחצו Register app.
3. יופיע אובייקט `firebaseConfig` עם שישה שדות (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
4. העתיקו את הערכים האלה לתוך הקובץ `merkaztech-firebase.js` בשורש הריפו, במקום הערכים `YOUR_...`.

## 3. הגדרת חוקי אבטחה (Security Rules)
1. ב-Firestore Database → לשונית **Rules**.
2. העתיקו לשם את התוכן של הקובץ `firestore.rules` מהריפו, ולחצו **Publish**.
3. זה מבטיח שכל אחד יכול *לצפות* ביומן, אבל רק צוות מחובר יכול *לערוך*.

## 4. יצירת התחברות לצוות
1. בתפריט הצד: **Build → Authentication → Get started**.
2. בלשונית **Sign-in method** הפעילו את הספק **Email/Password**.
3. בלשונית **Users → Add user** צרו משתמש אחד (או כמה) עם דוא"ל וסיסמה – אלה פרטי ההתחברות שתמסרו לאנשי הצוות שמזינים נתונים בדף `merkaztech-entry.html`.
   - אפשר ליצור משתמש נפרד לכל איש צוות, או משתמש משותף אחד לכולם.

## 5. פרסום
לאחר שמילאתם את `merkaztech-firebase.js`, פשוט דחפו (`git push`) את הקבצים – GitHub Pages יעדכן אוטומטית. אין צורך בשרת נוסף.

- דף הצפייה: `https://<הדומיין-שלכם>/merkaztech-log.html`
- דף ההזנה (לצוות): `https://<הדומיין-שלכם>/merkaztech-entry.html`

## ייצוא לאקסל
בשני הדפים יש כפתור **"ייצוא כל הנתונים לאקסל"** שמוריד בכל רגע נתון קובץ `.xlsx` עם כל הפעילויות שבמערכת, באותם טורים כמו ביומן המקורי (תאריך, שעות, תחום, בי"ס, מגמה, כיתה, תלמידים, מרחב למידה, הערות וכו') — כך שאפשר תמיד לקבל תמונת מצב מלאה וברורה מחוץ למערכת, בלי תלות בהתחברות.

## מבנה הנתונים
כל פעילות נשמרת כמסמך באוסף `activities` עם השדות: `date`, `startTime`, `endTime`, `domain`, `school`, `trackName`, `trackCode`, `percentGroup`, `className`, `studentsPlanned`, `studentsActual`, `teacher`, `space1Name`, `space1Number`, `space2Name`, `space2Number`, `notes` — תואמים לעמודות ביומן המקורי באקסל ("יומן פעילויות מרכזי").

## עלות
השימוש בטיר החינמי (Spark) של Firebase מספיק בנוחות ליומן כזה — אלפי קריאות/כתיבות ביום בחינם.
