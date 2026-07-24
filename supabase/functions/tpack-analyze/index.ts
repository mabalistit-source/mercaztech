// Supabase Edge Function: ניתוח מערך שיעור/פעילות לפי מודל TPACK (Mishra & Koehler).
// מקבלת טקסט שחולץ בדפדפן מקובץ Word/PDF שהמורה העלה, קוראת ל-Claude API עם מפתח
// שמוגדר כ-secret בפרויקט (לא נחשף ללקוח), ומחזירה ניתוח מובנה ב-JSON.
// פריסה: ראו MERKAZTECH-SETUP.md.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-5";
const MAX_INPUT_CHARS = 24000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOMAIN_KEYS = ["TK", "PK", "CK", "TPK", "TCK", "PCK", "TPACK"];

const SYSTEM_PROMPT = `אתה מומחה להוראה ולטכנולוגיה חינוכית, בקיא במודל TPACK של Mishra & Koehler (2006).
המודל מתאר שבעה תחומי ידע החופפים זה לזה:
- TK (ידע טכנולוגי): היכרות עם כלים וטכנולוגיות והיכולת להשתמש בהם.
- PK (ידע פדגוגי): שיטות הוראה, ניהול כיתה, הערכה, התאמה לגיל ולסגנונות למידה.
- CK (ידע תוכן): הבנת התוכן/המקצוע הנלמד לעומקו.
- PCK (ידע פדגוגי-תוכני): כיצד להנגיש את התוכן הספציפי הזה לתלמידים (אנלוגיות, קשיים נפוצים, רצף הוראה).
- TCK (ידע טכנולוגי-תוכני): כיצד הטכנולוגיה משנה/מייצגת את התוכן (סימולציה, כלי מדידה, ויזואליזציה).
- TPK (ידע טכנולוגי-פדגוגי): כיצד הטכנולוגיה משרתת שיטת הוראה (שיתופיות, משוב מיידי, יצירה).
- TPACK (הליבה המשולבת): שילוב הרמוני ומכוון-מטרה של שלושת התחומים יחד, לא רק "הוספת מחשב לשיעור".

תפקידך: לקרוא מערך שיעור/פעילות שהועלה על ידי מורה, ולנתח אותו לפי שבעת התחומים.
לכל תחום תן ציון 0-5 (0=לא מופיע כלל, 5=מיושם בעומק ובאופן מודע), הערכה מילולית קצרה (2-3 משפטים),
ורשימת ציטוטים/עדויות קצרות מתוך הטקסט שתומכות בציון (אם אין עדות ברורה — מערך ריק).
הבחן בין נוכחות טכנולוגיה "דקורטיבית" (מצגת כרקע) לבין שילוב אמיתי שמשנה את ההוראה או ההבנה.

החזר אך ורק JSON תקני (ללא מרקדאון, ללא טקסט מסביב) במבנה המדויק הזה:
{
  "title": "שם קצר לפעילות/לשיעור על סמך התוכן, או null אם לא ברור",
  "summary": "2-3 משפטים על מהות הפעילות",
  "domains": {
    "TK": { "score": 0, "assessment": "...", "evidence": ["..."] },
    "PK": { "score": 0, "assessment": "...", "evidence": ["..."] },
    "CK": { "score": 0, "assessment": "...", "evidence": ["..."] },
    "TPK": { "score": 0, "assessment": "...", "evidence": ["..."] },
    "TCK": { "score": 0, "assessment": "...", "evidence": ["..."] },
    "PCK": { "score": 0, "assessment": "...", "evidence": ["..."] },
    "TPACK": { "score": 0, "assessment": "...", "evidence": ["..."] }
  },
  "strengths": ["חוזק קונקרטי אחד למשפט"],
  "gaps": ["פער קונקרטי אחד למשפט"],
  "recommendations": ["המלצה מעשית וקונקרטית אחת למשפט, ספציפית לפעילות הזו — לא כללית"]
}
כל הטקסט בעברית. strengths, gaps, recommendations: 3-6 פריטים כל אחד.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

function isValidAnalysis(obj: any): boolean {
  if (!obj || typeof obj !== "object" || typeof obj.domains !== "object") return false;
  return DOMAIN_KEYS.every((key) => {
    const d = obj.domains[key];
    return d && typeof d.score === "number" && typeof d.assessment === "string" && Array.isArray(d.evidence);
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "יש לשלוח בקשת POST." }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ error: "המערכת עדיין לא מוגדרת בצד השרת (חסר ANTHROPIC_API_KEY). ראו MERKAZTECH-SETUP.md." }, 500);
  }

  let body: { text?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "בקשה לא תקינה — לא ניתן לקרוא JSON." }, 400);
  }

  const text = (body.text || "").trim();
  if (!text) {
    return jsonResponse({ error: "לא נמצא טקסט לניתוח. ודאו שהקובץ שהועלה מכיל טקסט (לא תמונה סרוקה בלבד)." }, 400);
  }
  if (text.length < 40) {
    return jsonResponse({ error: "הטקסט שחולץ מהקובץ קצר מדי לניתוח משמעותי." }, 400);
  }

  const truncated = text.length > MAX_INPUT_CHARS;
  const analyzedText = truncated ? text.slice(0, MAX_INPUT_CHARS) : text;

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `שם הקובץ: ${body.filename || "(לא ידוע)"}\n\nתוכן מערך השיעור/הפעילות:\n"""\n${analyzedText}\n"""`,
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Anthropic fetch failed", err);
    return jsonResponse({ error: "שגיאת תקשורת מול שירות הניתוח. נסו שוב בעוד רגע." }, 502);
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    console.error("Anthropic API error", anthropicRes.status, errText);
    const status = anthropicRes.status === 429 ? 429 : 502;
    return jsonResponse({
      error: status === 429
        ? "המערכת עמוסה כרגע (מכסת שימוש). נסו שוב בעוד דקה."
        : "שירות הניתוח החזיר שגיאה. נסו שוב מאוחר יותר.",
    }, status);
  }

  const data = await anthropicRes.json();
  const rawText: string = (data.content || []).map((b: any) => b.text || "").join("");

  let analysis: unknown;
  try {
    analysis = extractJson(rawText);
  } catch (err) {
    console.error("Failed to parse model JSON", err, rawText);
    return jsonResponse({ error: "הניתוח חזר בפורמט לא תקין. נסו שוב." }, 502);
  }

  if (!isValidAnalysis(analysis)) {
    console.error("Model JSON missing expected fields", rawText);
    return jsonResponse({ error: "הניתוח חזר לא שלם. נסו שוב." }, 502);
  }

  return jsonResponse({ analysis, truncated });
});
