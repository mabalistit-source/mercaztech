# הגדרת יומן הפעילויות המרכזי (מרכזטק)

המערכת מורכבת מכמה דפים סטטיים שרצים על GitHub Pages בדיוק כמו שאר האתר:

- **merkaztech-log.html** – תצוגה חיה וציבורית של היומן (לכל מי שיש לו את הקישור).
- **merkaztech-entry.html** – טופס הזנה/עריכה/מחיקה, מוגן בהתחברות, לצוות בלבד.
- **merkaztech-dashboard.html** – תפוסת חדרים בזמן אמת.

בנוסף, **tpack.html** הוא כלי עצמאי ונפרד לחלוטין (בלי מיתוג, בלי ניווט למערכות האלה) לניתוח מערכי שיעור/פעילויות
לפי מודל TPACK — ראו סעיף 6 למטה.

דפי היומן משתפים נתונים בזמן אמת דרך **Supabase** (מסד נתונים + התחברות בענן, בחינם, בלי כרטיס אשראי ובלי חשבון Google Cloud). כדי שהמערכת תעבוד צריך להשלים הקמה חד-פעמית של כ-10 דקות:

## 1. יצירת חשבון ופרויקט ב-Supabase
1. גשו ל-https://supabase.com ולחצו **Start your project**, והירשמו עם דוא"ל או GitHub (אין צורך בכרטיס אשראי).
2. לחצו **New project**. תנו שם (למשל `merkaztech-yoman`), בחרו סיסמה למסד הנתונים (שמרו אותה בצד, לא תצטרכו אותה בקוד) ובחרו אזור קרוב (למשל Europe).
3. המתינו כדקה עד שהפרויקט מוקם.

## 2. יצירת הטבלה והרשאות האבטחה
1. בתפריט הצד: **SQL Editor → New query**.
2. פתחו את הקובץ `supabase-schema.sql` מהריפו, העתיקו את כל התוכן, הדביקו בעורך ולחצו **Run**.
   - זה יוצר את טבלת `activities`, מגדיר הרשאות (כולם יכולים לקרוא, רק משתמשים מחוברים יכולים לכתוב), ומפעיל עדכונים בזמן אמת.

## 3. קבלת מפתחות החיבור
1. בתפריט הצד: **Project Settings (⚙️) → Data API**.
2. העתיקו את הערך **Project URL**.
3. באותו עמוד (או ב-**API Keys**), העתיקו את המפתח **anon public**.
4. פתחו בריפו את הקובץ `merkaztech-supabase.js`, והחליפו:
   - `YOUR_SUPABASE_URL` ← ה-Project URL
   - `YOUR_SUPABASE_ANON_KEY` ← מפתח ה-anon public

## 4. יצירת התחברות לצוות
1. בתפריט הצד: **Authentication → Providers**, ודאו ש-**Email** מופעל (מופעל כברירת מחדל).
2. **Authentication → Users → Add user → Create new user**.
3. הזינו דוא"ל וסיסמה עבור כל איש צוות (או משתמש משותף אחד לכולם), וסמנו **Auto Confirm User** כדי שיוכלו להתחבר מיד בלי לאשר מייל.
4. את פרטי ההתחברות האלה מוסרים לצוות כדי שיוכלו להיכנס בדף `merkaztech-entry.html`.

## 5. פרסום
לאחר שמילאתם את `merkaztech-supabase.js`, פשוט דחפו (`git push`) את הקבצים – GitHub Pages יעדכן אוטומטית. אין צורך בשרת נוסף.

- דף הצפייה: `https://<הדומיין-שלכם>/merkaztech-log.html`
- דף ההזנה (לצוות): `https://<הדומיין-שלכם>/merkaztech-entry.html`

## 6. הפעלת ניתוח TPACK (`tpack.html`)
דף עצמאי זה (בלי קשר ליומן הפעילויות) מאפשר להעלות מערך שיעור/פעילות כקובץ Word (.docx) או PDF, ומנתח אותו אוטומטית לפי מודל TPACK
בעזרת Claude (Anthropic). חילוץ הטקסט מהקובץ קורה כולו בדפדפן (אין העלאה של הקובץ עצמו לשום שרת);
רק הטקסט שחולץ נשלח לניתוח. הניתוח **לא נשמר** במסד הנתונים — הוא מוצג על המסך בלבד, בכל פעם מחדש.

מכיוון שהניתוח קורא ל-API בתשלום, מפתח ה-API לא יכול לשבת בקוד הצד-לקוח (כמו שאר האתר) — הוא רץ
בתוך **Supabase Edge Function** (קוד שרת קטן שרץ אצל Supabase, לא אצלכם), כדי שהמפתח יישאר סודי.

**חשוב:** `tpack.html` משתמש בפרויקט Supabase **נפרד לגמרי** מזה של יומן הפעילויות — מוגדר בקובץ
`tpack-supabase.js` (ולא ב-`merkaztech-supabase.js`). זה מכוון: הכלי עצמאי ולא אמור לגעת בנתוני היומן.
המשמעות המעשית: יש להעלות את הפונקציה **לאותו פרויקט Supabase שכתובתו מופיעה ב-`tpack-supabase.js`**
(שדה `supabaseUrl`) — לא לפרויקט אחר, גם אם יש כמה פרויקטים בחשבון.

### הקמה חד-פעמית — דרך אתר Supabase (בלי התקנות, מומלץ)
1. קבלת מפתח API מ-[console.anthropic.com](https://console.anthropic.com) (יש ליצור חשבון ולהטעין קרדיט — העלות משוערת: כמה סנטים לניתוח בודד).
2. ב-[supabase.com](https://supabase.com) → נכנסים ל**אותו פרויקט** שכתובתו (`supabaseUrl`) מופיעה ב-`tpack-supabase.js`.
3. בתפריט הצד: **Edge Functions** → **Create a new function** → שם מדויק: `tpack-analyze`.
4. מדביקים בעורך את **כל** תוכן הקובץ `supabase/functions/tpack-analyze/index.ts` מהריפו → **Deploy**.
5. **Project Settings** (⚙️) → **Edge Functions** (או **Secrets**) → מוסיפים secret בשם `ANTHROPIC_API_KEY` עם המפתח משלב 1.
6. זהו — `tpack.html` יתחיל לעבוד תוך כמה שניות.

### הקמה חד-פעמית — דרך שורת פקודה (Supabase CLI, לחלופין)
1. קבלת מפתח API כמו למעלה.
2. התקנת [Supabase CLI](https://supabase.com/docs/guides/cli) במחשב (חד-פעמי): `npm install -g supabase`
3. התחברות וקישור **לאותו פרויקט** שמוגדר ב-`tpack-supabase.js` (ה-`<project-ref>` הוא החלק הראשון בכתובת, למשל `kvgdmwbxovioqrrynsjl`):
   ```
   supabase login
   supabase link --project-ref <project-ref>
   ```
4. הגדרת מפתח ה-API כ-secret (לא נחשף ללקוח, לא נכנס לגיט):
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. פריסת הפונקציה מתוך שורש הריפו:
   ```
   supabase functions deploy tpack-analyze
   ```

### עדכון עתידי
כל שינוי בקובץ `supabase/functions/tpack-analyze/index.ts` (למשל שינוי הפרומפט או הדגם) דורש הרצה חוזרת של
`supabase functions deploy tpack-analyze` כדי שהשינוי ייכנס לתוקף.

### עלות
כל ניתוח הוא קריאה בודדת ל-Claude API — עלות נמוכה מאוד לניתוח בודד (ראו תמחור עדכני ב-console.anthropic.com).
אין עלות נוספת מעבר לזה (Edge Functions בתוכנית החינמית של Supabase כוללות מכסה חודשית נדיבה).

## ייצוא לאקסל
בשני הדפים יש כפתור **"ייצוא כל הנתונים לאקסל"** שמוריד בכל רגע נתון קובץ `.xlsx` עם כל הפעילויות שבמערכת, באותם טורים כמו ביומן המקורי (תאריך, שעות, תחום, בי"ס, מגמה, כיתה, תלמידים, מרחב למידה, הערות וכו') — כך שאפשר תמיד לקבל תמונת מצב מלאה וברורה מחוץ למערכת, בלי תלות בהתחברות.

## מבנה הנתונים
כל פעילות נשמרת כשורה בטבלת `activities` עם העמודות: `date`, `start_time`, `end_time`, `domain`, `school`, `track_name`, `track_code`, `percent_group`, `class_name`, `students_planned`, `students_actual`, `teacher`, `space1_name`, `space1_number`, `space2_name`, `space2_number`, `notes` — תואמות לעמודות ביומן המקורי באקסל ("יומן פעילויות מרכזי"). ההגדרה המלאה נמצאת ב-`supabase-schema.sql`.

## עלות ותחזוקה
- התוכנית החינמית של Supabase כוללת 500MB מסד נתונים ומנוי realtime — מעבר למה שיומן כזה צריך.
- **שימו לב:** בתוכנית החינמית, פרויקט שלא נעשה בו שימוש כשבוע ימים "נרדם" אוטומטית. פשוט היכנסו ל-supabase.com וללחוץ "Restore project" כדי להעיר אותו — הנתונים לא נמחקים.
