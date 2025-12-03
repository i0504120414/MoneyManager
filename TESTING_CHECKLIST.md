# ✅ בדיקות ודירוג כמעל

## רשימת בדיקה - מוכנות המערכת

### ✅ שלב 1: Supabase

- [ ] Supabase Project נוצר
- [ ] API Keys עתקו (URL וא-anon key)
- [ ] SQL Schema הורץ ב-SQL Editor
- [ ] טבלאות `bank_accounts` ו-`transactions` קיימות
- [ ] Policies הוגדרו

**איך לבדוק:**
```sql
-- בניתן SQL Editor ב-Supabase
SELECT * FROM bank_accounts;
SELECT * FROM transactions;
```

---

### ✅ שלב 2: GitHub Secrets

- [ ] `SUPABASE_URL` הוסף
- [ ] `SUPABASE_KEY` הוסף
- [ ] Secrets מוצפנים (לא רואים אותם אחרי הוספה)

**איך לבדוק:**
1. Settings → Secrets and variables → Actions
2. תראו את שמות ה-Secrets אבל לא את הערכים

---

### ✅ שלב 3: Workflows

- [ ] `add-account.yml` קיים
- [ ] `scrape-transactions.yml` קיים
- [ ] `list-accounts.yml` קיים

**איך לבדוק:**
1. כנסו ל-Actions בריפוזיטוריום
2. תראו את 3 ה-Workflows רשומים

---

### ✅ שלב 4: ריצה ראשונה של List Accounts

1. כנסו ל-**Actions**
2. בחרו **List Accounts**
3. לחצו **"Run workflow"**
4. בחרו **Branch: main**
5. לחצו **"Run workflow"** שוב

**תוצאות צפויות:**
- ✅ Workflow יתחיל (תראו סטטוס כחול)
- ✅ לאחר דקה, תסתיים בהצלחה (✓ ירוק)
- ✅ תראו artifact `accounts-list`

**אם יש שגיאה:**
```
❌ "permission denied for schema public"
→ בדקו את RLS Policies בתבנית SQL

❌ "relation bank_accounts does not exist"
→ בדקו שהטבלאות נוצרו בתבנית SQL

❌ "Missing Supabase credentials"
→ בדקו שה-Secrets הוספו בנכון
```

---

## 🧪 בדיקות מפורטות

### בדיקה 1: Supabase Connection

```bash
npm install
SUPABASE_URL=https://xxxxx.supabase.co SUPABASE_KEY=your_key node src/scripts/listAccounts.js
```

**תוצאה צפויה:**
```
📋 Fetching all bank accounts...

No accounts found
✓ Total accounts: 0
```

---

### בדיקה 2: Add Account (הוספת חשבון)

**דרך GitHub Actions:**
1. Actions → Add Account
2. בחרו בנק (לדוגמה: `hapoalim`)
3. מלאו פרטים (יכולים להיות דמיוניים לבדיקה)
4. לחצו Run workflow

**תוצאה צפויה:**
```json
{
  "success": true,
  "accountId": "550e8400-e29b-41d4-a716-446655440000",
  "bankName": "Bank Hapoalim",
  "createdAt": "2024-01-15T10:30:00Z",
  "message": "Account successfully created with ID: 550e8400..."
}
```

---

### בדיקה 3: List Accounts After Add

בעד הוספה של חשבון:

1. Actions → List Accounts
2. Run workflow

**תוצאה צפויה:**
```json
{
  "total": 1,
  "accounts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "bankType": "hapoalim",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUpdated": "2024-01-15T10:30:00Z",
      "isActive": true
    }
  ]
}
```

---

### בדיקה 4: Scxxxxxxransactions

**דרישות:**
- ✅ חשבון צריך להיות קיים (מבדיקה 2)
- ✅ עסקאות צריכות להיות בבנק בפועל

**ריצה:**
1. Actions → Scrape Transactions
2. Account ID: העתיקו מבדיקה 3
3. Scraping Mode: בחרו `regular`
4. Run workflow

**תוצאה צפויה:**
```json
{
  "success": true,
  "accountId": "550e8400-e29b-41d4-a716-446655440000",
  "scrapingMode": "regular",
  "transactionsSaved": 25,
  "completedAt": "2024-01-15T10:45:00Z"
}
```

---

## 🔍 Debugging

### Logs של Workflow

כל Workflow מראה לוג מפורט:

1. Actions → בחרו את ה-Workflow
2. לחצו על **הריצה** האחרונה
3. לחצו על **Job** (test_and_add, scrape, וכו')
4. ראו את ה-Logs המלאים

### סוגי Errors נפוצים

#### Error: "Account not found"
```
Reason: Account ID לא קיים בתבנית
Fix: הריצו "List Accounts" כדי להשיג ID חדש
```

#### Error: "Connection test failed"
```
Reason: נתוני בנק לא נכונים
Fix: בדקו את שם המשתמש / סיסמה בבנק בעצמכם
```

#### Error: "No transactions found"
```
Reason: אין עסקאות בתקופה הנבחרת
Fix: נסו "deep" mode או בחרו תאריך שונה
```

#### Error: "SUPABASE_URL is missing"
```
Reason: Secrets לא הוספו בנכון
Fix: בדקו Settings → Secrets and variables → Actions
```

---

## 📊 בדיקה של מסד הנתונים

### ב-Supabase Dashboard

1. כנסו ל-Supabase Project שלכם
2. **Table Editor** בצד שמאל
3. בחרו `bank_accounts`
4. תראו את כל החשבונות שהוספתם

### SQL Query ישיר

```sql
-- ראו את כל החשבונות
SELECT id, bank_type, created_at, is_active FROM bank_accounts;

-- ראו את כל העסקאות
SELECT * FROM transactions ORDER BY date DESC LIMIT 10;

-- ראו סטטיסטיקות
SELECT * FROM transaction_summary;
```

---

## 📈 Performance

### עסקאות רבות

אם סריקת "deep" אטית:

1. נסו "custom" עם תאריך מסוים
2. או הריצו בשעות הלילה (Workflows רצים יותר מהר)

### אופטימיזציה

```sql
-- בדקו את האינדקסים
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- אם חסרים אינדקסים, בנו אותם
CREATE INDEX idx_bank_accounts_created_at ON bank_accounts(created_at);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

---

## 🎯 Checklist - הכל עובד?

- [ ] Supabase מוגדר כשורה
- [ ] GitHub Secrets מוגדרים
- [ ] List Accounts Workflow עבד
- [ ] חשבון בנק התווסף בהצלחה
- [ ] עסקאות בוצעו בהצלחה
- [ ] אתם יכולים לראות דטה ב-Supabase Dashboard

✨ **אם כל זה בחצי - אתם מוכנים!**

---

## 🆘 צריכים עזרה נוספת?

בדקו את:
1. [QUICKSTART.md](./QUICKSTART.md) - התחלה מהירה
2. [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - הגדרת Secrets
3. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - הגדרת מסד נתונים
4. [USAGE_GUIDE.md](./USAGE_GUIDE.md) - מדריך שימוש מלא
