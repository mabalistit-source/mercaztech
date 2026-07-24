# קבצי צד-שלישי (vendored)

נטענים ישירות מהריפו (בלי CDN חיצוני, בלי שלב build) כדי לחלץ טקסט מקבצי Word/PDF שמעלים בדף `merkaztech-tpack.html`:

- `mammoth.browser.min.js` — [mammoth.js](https://github.com/mwilliamson/mammoth.js) v1.9.1 (BSD-2-Clause). חילוץ טקסט מ-`.docx`. חושף `window.mammoth`.
- `pdf.min.mjs` + `pdf.worker.min.mjs` — [pdf.js](https://github.com/mozilla/pdf.js) v4.7.76 (Apache-2.0). חילוץ טקסט מ-`.pdf`. שני הקבצים חייבים להישאר **מאותה גרסה** זה מול זה.

לשדרוג גרסה: `npm pack mammoth@<ver>` / `npm pack pdfjs-dist@<ver>`, לפרוק ולהחליף את הקבצים כאן.
