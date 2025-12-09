# MoneyManager - Bank Scraper

מערכת לסרק נתונים מחשבונות בנקאיים ישראליים ולשמור אותם בSupabase.

## ✨ תכונות

- 🏦 תמיכה בבנקים ישראליים (Hapoalim, Leumi, Visa Cal, Amex וגו')
- 📊 שמירה של עסקאות בSupabase
- 🤖 ריצה אוטומטית בGitHub Actions
- 🔒 סביבה מאובטחת עם Docker
- 🛡️ Headless browser protection (User-Agent spoofing, Cloudflare handling)

## 📋 דרישות

- Node.js 20+
- npm
- Supabase project
- GitHub account (לאוטומציה)

## 🚀 התחלה מהירה

### 1. סביבה מקומית

```bash
# התקנת תלויות
npm install

# יצירת .env מ-example
cp .env.example .env

# עריכת ה-.env עם פרטיים שלך
nano .env
```

### 2. הגדרת Supabase

```bash
# יצירת טבלאות
node src/scripts/setupDatabase.js
```

### 3. בדיקה של חיבור

```bash
BANK_TYPE=hapoalim node src/scripts/testConnection.js
```

## 🐳 Docker

### Build locally

```bash
docker build -t money-manager:latest .
```

### Run with Docker

```bash
docker run --rm \
  -e BANK_TYPE=hapoalim \
  -e USER_CODE=your_code \
  -e PASSWORD=your_password \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_KEY=your_key \
  money-manager:latest \
  src/scripts/testConnection.js
```

## 🤖 GitHub Actions Automation

### Setup

1. Fork the repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `BANK_TYPE` - sוג הבנק
   - `USER_CODE` - קוד משתמש
   - `PASSWORD` - סיסמה
   - `SUPABASE_URL` - URL של Supabase
   - `SUPABASE_KEY` - API key של Supabase

4. סקריפט יריץ באופן אוטומטי פעמיים ביום (10:05 ו-22:05 UTC)

## 📁 Structure

```
├── src/
│   ├── scripts/
│   │   ├── testConnection.js - בדיקת חיבור
│   │   ├── scrapeTransactions.js - סרסור עסקאות
│   │   ├── setupDatabase.js - יצירת טבלאות
│   │   └── scraper.js - ממשק הסקריפ
│   ├── config/
│   │   └── banks.js - הגדרות בנקים
├── .github/
│   └── workflows/
│       └── scrape.yml - GitHub Actions workflow
├── Dockerfile - Docker image
├── database.sql - SQL schema
└── patches/ - Patches לpaqckages
```

## 🔧 Configuration

### Environment Variables

- `BANK_TYPE` - סוג הבנק
- `USER_CODE`, `PASSWORD`, `ID`, וכו' - פרטי התחברות לבנק
- `SUPABASE_URL`, `SUPABASE_KEY` - Supabase configuration
- `PUPPETEER_EXECUTABLE_PATH` - נתיב ל-Chromium (GitHub Actions: `/usr/bin/chromium`)

### Patches

הפרויקט משתמש ב-patches עבור:
- `israeli-bank-scrapers+6.3.7.patch` - User-Agent spoofing וError messages
- `ky+1.14.1.patch` - Timeout extension

Patches יחלו אוטומטית עם `npm install` (postinstall script).

## 📚 Scrapers

### Supported Banks

- Hapoalim (בנק הפועלים)
- Leumi (בנק לאומי)
- Mizrahi (בנק מזרחי)
- Discount (בנק דיסקונט)
- Mercantile (בנק מרכנטיל)
- Visa Cal (ויזה קל)
- Amex (אמריקן אקספרס)
- Isracard (אישראקרט)

## 🐛 Troubleshooting

### Headless Browser Detection

אם הבנק זוהה כך שהדפדפן בmode headless:

1. בדוק שה-User-Agent מחליף ✓ (כבר יש patch)
2. בדוק שה-viewport הוא 1920x1080 ✓
3. בדוק שה-args כוללות `--disable-dev-shm-usage` ו-`--no-sandbox` ✓

### Cloudflare

אם יש Cloudflare challenge, המערכת מנסה לפתור באוטומטי עם solveTurnstile.

### Timeout Issues

אם יש timeout errors:
- Ky timeout הוגדל ל-180 שניות (patch)
- Navigation timeout: 60 שניות

## 📝 Database Schema

### Tables

- `bank_user_accounts` - פרטי המשתמש לכל בנק
- `bank_accounts` - חשבונות בנקאיים
- `transactions` - עסקאות

ראה `database.sql` לפרטים מלאים.

## 🔐 Security

- Credentials לא נשמרים ברפו, רק בGitHub Secrets
- Headless browser מוסווה (User-Agent spoofing)
- Domain whitelisting אפשרי עבור בקרת access

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome!

## 📞 Support

עבור בעיות, פתח issue בGitHub.
