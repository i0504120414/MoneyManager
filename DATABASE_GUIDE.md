# 📊 מדריך מסד הנתונים - Supabase

## 🗂️ מבנה הטבלאות

### טבלה 1: `bank_accounts` (חשבונות בנקאיים)

זו הטבלה המרכזית שבה אנו שומרים את החשבונות של המשתמשים.

#### העמודות:

| שם | סוג | תיאור |
|-----|-----|---------|
| `id` | UUID | מזהה ייחודי של החשבון (נוצר אוטומטית) |
| `bank_type` | VARCHAR(50) | סוג הבנק (hapoalim, leumi, וכו') |
| `credentials` | JSONB | פרטי התחברות מוצפנים (JSON) |
| `created_at` | TIMESTAMP | תאריך יצירת החשבון |
| `last_updated` | TIMESTAMP | תאריך העדכון האחרון |
| `is_active` | BOOLEAN | האם החשבון פעיל |

#### דוגמה של שורה:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "bank_type": "hapoalim",
  "credentials": {
    "userCode": "123456",
    "password": "encrypted_password_here"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "last_updated": "2024-01-15T10:30:00Z",
  "is_active": true
}
```

#### SQL Query לדוגמה:

```sql
-- ראו את כל החשבונות הפעילים
SELECT id, bank_type, created_at, last_updated, is_active 
FROM bank_accounts 
WHERE is_active = true;

-- מחפשים חשבון מסוים
SELECT * FROM bank_accounts 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- ספירת חשבונות לפי בנק
SELECT bank_type, COUNT(*) as total 
FROM bank_accounts 
GROUP BY bank_type;
```

---

### טבלה 2: `transactions` (עסקאות)

זו הטבלה שבה אנו שומרים את כל העסקאות שסרקנו מהבנקים.

#### העמודות:

| שם | סוג | תיאור |
|-----|-----|---------|
| `id` | UUID | מזהה ייחודי של העסקה (נוצר אוטומטית) |
| `account_id` | UUID | מזהה החשבון (קשר לטבלה `bank_accounts`) |
| `date` | TIMESTAMP | תאריך העסקה |
| `description` | VARCHAR(500) | תיאור העסקה |
| `amount` | DECIMAL(12,2) | הסכום |
| `type` | VARCHAR(10) | סוג עסקה: 'debit' או 'credit' |
| `category` | VARCHAR(50) | קטגוריה (אופציונלי) |
| `raw_data` | JSONB | הנתונים הגולמיים מהבנק |
| `created_at` | TIMESTAMP | מתי הנתון שמור במערכת שלנו |

#### דוגמה של שורה:

```json
{
  "id": "660f9511-f40c-52e5-b827-557766551111",
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2024-01-14T12:30:00Z",
  "description": "פ תנובה לשכ כ",
  "amount": -250.50,
  "type": "debit",
  "category": "groceries",
  "raw_data": {
    "originalDescription": "SUPER MARKET TENUVA",
    "txnId": "12345"
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### SQL Query לדוגמה:

```sql
-- ראו את כל העסקאות של חשבון מסוים
SELECT * FROM transactions 
WHERE account_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY date DESC;

-- עסקאות מהשבוע האחרון
SELECT * FROM transactions 
WHERE date >= NOW() - INTERVAL '7 days'
ORDER BY date DESC;

-- סכום כנסה וחוצוא חודש זה
SELECT 
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'debit' THEN ABS(amount) ELSE 0 END) as expenses
FROM transactions 
WHERE account_id = '550e8400-e29b-41d4-a716-446655440000'
AND date >= DATE_TRUNC('month', NOW())
AND date < DATE_TRUNC('month', NOW() + INTERVAL '1 month');
```

---

## 🔗 הקשר בין הטבלאות

```
bank_accounts (1) ─────── (Many) transactions
    id  ──────────────→ account_id
```

כל עסקה שייכת לחשבון ספציפי דרך `account_id`.

### דוגמה:

```sql
-- חשבון
INSERT INTO bank_accounts (bank_type, credentials, is_active)
VALUES ('hapoalim', '{"userCode":"123"}', true);
-- id נוצר אוטומטית, בואו נגיד: 550e8400-...

-- עסקאות
INSERT INTO transactions (account_id, date, description, amount, type)
VALUES 
  ('550e8400-...', NOW(), 'עסקה 1', -100, 'debit'),
  ('550e8400-...', NOW(), 'עסקה 2', 50, 'credit');
```

---

## 👀 Views (תצוגות)

### `transaction_summary`

זוהי view שנותנת סטטיסטיקות על כל חשבון.

#### דוגמה שורה:

```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "bank_type": "hapoalim",
  "transaction_count": 150,
  "total_credits": 5000.00,
  "total_debits": 3500.00,
  "last_transaction_date": "2024-01-15T10:30:00Z",
  "last_updated": "2024-01-15T10:30:00Z"
}
```

#### איך להשתמש:

```sql
SELECT * FROM transaction_summary 
WHERE bank_type = 'hapoalim';
```

---

## 🔧 Functions (פונקציות)

### `get_account_stats(account_id)`

פונקציה שנותנת סטטיסטיקות מפורטות על חשבון.

#### תוצאה:

```json
{
  "total_transactions": 150,
  "total_income": 15000.00,
  "total_expenses": 10500.00,
  "average_transaction": 168.33,
  "date_range_start": "2023-01-01T00:00:00Z",
  "date_range_end": "2024-01-15T10:30:00Z"
}
```

#### איך להשתמש:

```sql
SELECT * FROM get_account_stats('550e8400-e29b-41d4-a716-446655440000');
```

---

## 🔒 Row Level Security (RLS)

ה-RLS משמש להגנה על הנתונים. כרגע, כל המדיניויות מאפשרות גישה פומבית (public).

### Policies הנוכחיות:

```sql
-- bank_accounts
CREATE POLICY "Allow public read access to accounts" ON bank_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert to accounts" ON bank_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to accounts" ON bank_accounts FOR UPDATE USING (true) WITH CHECK (true);

-- transactions  
CREATE POLICY "Allow public read access to transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert to transactions" ON transactions FOR INSERT WITH CHECK (true);
```

### אם רוצים להשבית RLS (לפעמים יש בעיות):

```sql
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

---

## 🔍 דוגמאות Query מועילות

### סטטיסטיקות חודשיות

```sql
SELECT 
  DATE_TRUNC('month', date) as month,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as monthly_income,
  SUM(CASE WHEN type = 'debit' THEN ABS(amount) ELSE 0 END) as monthly_expenses
FROM transactions
WHERE account_id = '550e8400-...'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;
```

### עסקאות בקטגוריה מסוימת

```sql
SELECT * FROM transactions
WHERE account_id = '550e8400-...'
AND category = 'groceries'
ORDER BY date DESC
LIMIT 20;
```

### כל העסקאות מעל סכום מסוים

```sql
SELECT * FROM transactions
WHERE account_id = '550e8400-...'
AND ABS(amount) > 500
ORDER BY date DESC;
```

### עסקאות בטווח תאריכים

```sql
SELECT * FROM transactions
WHERE account_id = '550e8400-...'
AND date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY date DESC;
```

---

## 📈 Indexes (אינדקסים)

אנחנו כבר יצרנו אינדקסים בשביל performance:

```sql
-- bank_accounts
CREATE INDEX idx_bank_accounts_bank_type ON bank_accounts(bank_type);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

-- transactions
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
```

אם רוצים להוסיף עוד אינדקסים:

```sql
-- לשיפור Query של עסקאות לפי חשבון וקטגוריה
CREATE INDEX idx_transactions_account_category ON transactions(account_id, category);

-- לשיפור Query של עסקאות חדשות
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

---

## 🗑️ Maintenance

### ניקוי (Backup לפני!)

```sql
-- מחקו עסקאות ישנות מעל 5 שנים
DELETE FROM transactions 
WHERE date < (NOW() - INTERVAL '5 years');

-- השבתו חשבונות שלא השתמשו 6 חודשים
UPDATE bank_accounts 
SET is_active = false 
WHERE last_updated < (NOW() - INTERVAL '6 months');
```

### Vacuum (ניקוי פיזי)

```sql
VACUUM ANALYZE bank_accounts;
VACUUM ANALYZE transactions;
```

---

## 🆘 בעיות נפוצות

### בעיה: "permission denied for schema public"

**גורם:** RLS Policies לא מוגדרות נכון

**פתרון:**
```sql
-- שבתו RLS זמנית
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- או הסרו את ה-policies וייצרו מחדש
DROP POLICY IF EXISTS "Allow public read access to accounts" ON bank_accounts;
CREATE POLICY "Allow public read access to accounts" ON bank_accounts FOR SELECT USING (true);
```

### בעיה: "duplicate key value violates unique constraint"

**גורם:** ניסיון להוסיף עסקה זהה

**פתרון:** יש לנו UNIQUE constraint על:
```sql
(account_id, date, description, amount)
```

אם רוצים להוסיף עסקה זהה שוב:
```sql
-- מחקו את הישנה
DELETE FROM transactions 
WHERE account_id = '550e8400-...' 
AND date = '2024-01-15' 
AND description = 'test'
AND amount = -100;
```

---

## 📚 קישורים שימושיים

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [SQL Tutorial](https://www.w3schools.com/sql/)
