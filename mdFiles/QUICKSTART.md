# ⚙️ הגדרה מלאה של MoneyManager

guide זה יוביל אתכם דרך כל ההגדרה בשלבים פשוטים.

## 📋 דרישות

- GitHub Account
- Supabase Account (בחינם)
- Node.js 18+ (עבור development מקומי)

---

## 🚀 Quick Start (5 דקות)

### שלב 1: יצרו Supabase Project

1. כנסו ל-[supabase.com](https://supabase.com)
2. לחצו **"New Project"**
3. בחרו Region (Europe מומלץ)
4. הגדרו סיסמה חזקה

### שלב 2: קחו את ה-API Keys

1. בפרויקט שלכם, כנסו ל-**Settings → API**
2. עתקו:
   - **Project URL** 
   - **anon key**

### שלב 3: יצרו את הטבלאות

1. ב-Supabase, כנסו ל-**SQL Editor**
2. לחצו **"New Query"**
3. העתיקו את הקוד מ-`database.sql` בריפוזיטוריום
4. לחצו **"Run"**

### שלב 4: הוסיפו GitHub Secrets

1. בריפוזיטוריום, כנסו ל-**Settings → Secrets and variables → Actions**
2. לחצו **"New repository secret"**
3. הוסיפו 2 Secrets:

```
Name: SUPABASE_URL
Value: https://xxxxx.supabase.co

---

Name: SUPABASE_KEY
Value: eyJhbGc... (ה-anon key שלכם)
```

✅ **וזהו! סיימתם!**

---

## 🎯 השימוש בפועל

### הוספת חשבון בנקאי

1. כנסו ל-**Actions** בריפוזיטוריום
2. בחרו **Add Account**
3. לחצו **Run workflow**
4. בחרו בנק ומלאו את הנתונים
5. התוצאה תיראה כמו:

```json
{
  "success": true,
  "accountId": "550e8400-e29b-41d4-a716-446655440000",
  "bankName": "Bank Hapoalim",
  "message": "Account successfully created with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

**שמרו את ה-Account ID** - תזדקיקו לו לסריקות!

### סריקת עסקאות

1. כנסו ל-**Actions → Scrape Transactions**
2. לחצו **Run workflow**
3. הכניסו:
   - **Account ID** - מה שקיבלתם למעלה
   - **Scraping Mode** - בחרו מאפשרויות:
     - `regular` - 3 חודשים אחרונים (מהר)
     - `update` - מהעדכון האחרון (כי הקצר)
     - `deep` - כל ההיסטוריה מ-2015 (איט)
     - `custom` - תאריך מסוים

4. תראו בتוצאות כמה עסקאות נשמרו

### רשימת חשבונות

1. כנסו ל-**Actions → List Accounts**
2. לחצו **Run workflow**
3. בתום ההרצה, כנסו לתבנית וראו את ה-Artifacts

---

## 📊 בדיקה שהכל עובד

אחרי שסיימתם:

```bash
# 1. אם רוצים לבדוק מקומית
npm install
SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=yourkey npm run dev

# 2. או בדוק דרך Workflow
# כנסו ל-Actions → List Accounts → Run workflow
```

אם תראו רשימת חשבונות ללא שגיאות - **כל הדברים עובדים!** ✅

---

## 🏦 רשימת בנקים חשובים

| בנק | שדות נדרשים | דוגמה |
|-----|-----------|--------|
| **Hapoalim** | `userCode`, `password` | User Code: 123456 |
| **Leumi** | `username`, `password` | Username: user@bank |
| **Mizrahi** | `username`, `password` | Username: user@bank |
| **Discount** | `id`, `password`, `num` | ID: 12345678, Num: 123 |
| **Isracard** | `id`, `card6Digits`, `password` | Last 6: 123456 |
| **Amex** | `id`, `card6Digits`, `password` | Last 6: 123456 |
| **One Zero** | `email`, `password`, `phoneNumber` | Email: user@email.com |

---

## 🔒 אבטחה

### ✅ מה שעושים

- שומרים Credentials ב-GitHub Secrets (מוצפנים)
- Secrets לא חשופים בלוגים
- שימוש ב-Supabase RLS (Row Level Security)

### ❌ מה שלא עושים

- **אל תשמרו Credentials בקוד!**
- **אל תחשפו את ה-Keys בפומבי!**
- **אל תשמרו plaintext passwords בדטה בייס!**

---

## 🆘 Troubleshooting

### "❌ Connection test failed"
- בדקו שנתוני הבנק נכונים
- אם יש OTP, ייתכן שצריך ידנית
- נסו עדכון הסיסמה בבנק

### "Account not found"
- בדקו שה-Account ID נכון
- הריצו "List Accounts" כדי לראות את רשימת החשבונות

### "No transactions found"
- ייתכן שאין עסקאות בתקופה
- נסו "deep" mode לסריקה מלאה

### Workflow נכשל עם Supabase error
- בדקו שה-Secrets נוספו בנכון
- וודאו שהטבלאות קיימות בסופרבייס
- שתקו RLS Policies אם יש בעיות

---

## 📚 קבצים חשובים

- **README.md** - מדריך כללי
- **GITHUB_SECRETS_SETUP.md** - איך להוסיף Secrets
- **SUPABASE_SETUP.md** - הגדרת מסד הנתונים
- **USAGE_GUIDE.md** - מדריך מפורט לשימוש
- **database.sql** - Schema של מסד הנתונים

---

## ✨ דוגמה סיום

```
✓ Supabase Project נוצר
✓ GitHub Secrets הוסיפו
✓ Workflow "List Accounts" עבד
✓ חשבון בנק התווסף
✓ עסקאות בוצעו בהצלחה

🎉 מוכן לשימוש!
```

---

## 🤝 עזרה נוספת

אם נתקלתם בבעיות:

1. 👉 בדקו את ה-Workflow logs בתבנית Actions
2. 👉 בדקו את [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)
3. 👉 בדקו את [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
4. 👉 בדקו את [USAGE_GUIDE.md](./USAGE_GUIDE.md)
