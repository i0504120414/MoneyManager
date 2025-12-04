# 🔧 Supabase Setup Guide

## שלב 1: יצירת Supabase Project

1. כנסו ל [supabase.com](https://supabase.com)
2. לחצו על "New Project"
3. בחרו מוד הערה (Region) הקרוב אליכם (או בחרו Europe)
4. הכניסו סיסמה חזקה למנהל הבסיס הנתונים

## שלב 2: קבלת API Keys

1. בחלק "Project Settings"
2. לחצו על "API"
3. עתקו:
   - **Project URL** �? `SUPABASE_URL`
   - **anon key** �? `SUPABASE_KEY`

## שלב 3: יצירת טבלאות

### דרך A: SQL Editor (מומלץ)

1. כנסו ל **SQL Editor** בתפריט בצד שמאל
2. לחצו על "New Query"
3. העתיקו ופרסמו את ה-SQL הבא:

```sql
-- Create bank_accounts table
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_type VARCHAR(50) NOT NULL,
  credentials JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  last_updated TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_bank_accounts_bank_type ON bank_accounts(bank_type);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  description VARCHAR(500),
  amount DECIMAL(12, 2),
  type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
  category VARCHAR(50),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(account_id, date, description, amount)
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Allow public read access to accounts" ON bank_accounts
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to accounts" ON bank_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to transactions" ON transactions
  FOR INSERT WITH CHECK (true);
```

4. לחצו "Run"

### דרך B: Table Editor (ממשק גרפי)

1. כנסו ל **Table Editor**
2. לחצו "Create a new table"
3. שם הטבלה: `bank_accounts`
4. הוסיפו עמודות:
   - `id` (UUID, Primary Key)
   - `bank_type` (varchar)
   - `credentials` (jsonb)
   - `created_at` (timestamp)
   - `last_updated` (timestamp)
   - `is_active` (boolean)

5. חזרו על התהליך ל-`transactions`

## שלב 4: הוסיפו GitHub Secrets

1. כנסו לריפוזיטוריום שלכם ב-GitHub
2. **Settings** �? **Secrets and variables** �? **Actions**
3. לחצו "New repository secret"
4. הוסיפו:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Project URL מ-Supabase |
| `SUPABASE_KEY` | anon key מ-Supabase |

## שלב 5: Testxxxxxxction

כדי לבדוק שהכל עובד:

```bash
# עדכנו את הערכים שלכם
export SUPABASE_URL="your-url"
export SUPABASE_KEY="your-key"

# בדקו את החיבור
npm install
node src/scripts/listAccounts.js
```

אם תראו שגיאות של RLS (Row Level Security), בצעו:

1. כנסו ל-Supabase SQL Editor
2. בדקו את ה-Policies שיצרנו
3. או שבינתיים תוכלו להשבית RLS:

```sql
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

## 🔑 משתנים סביבה ל-GitHub Actions

```yaml
# בקובץ workflow, משתנים אלה מחבורים אל Secrets:
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

## 📋 בדיקת מצב הטבלאות

בעוד שמסתכלים ב-Supabase Dashboard:

1. **Table Editor** �? בחרו `bank_accounts` או `transactions`
2. יתר בחלקן של פסקות - זה יראה לכם את הנתונים

## 🔒 אבטחה

### הוצאת credentials מ-Logs

GitHub Actions במטבח לא יוצג `${{ secrets.* }}` בלוג - אבל אל תיתנו שנראה אחרי מעד:

```yaml
# Good ✓
env:
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

# Bad �? - Don't hardcode!
env:
  SUPABASE_KEY: "pk_anon_abc123..."
```

### הצפנה של Credentials

בתוך `credentials` JSONB, אתם יכולים לשמור כל field שצריך:

```json
{
  "username": "user@example.com",
  "password": "encrypted_password_here",
  "num": "123",
  ...
}
```

**בעתיד**: שקלו להצפין את ה-credentials בעזרת ספריה כמו `crypto` או שירות חיצוני.

## 🆘 Troubleshooting

### Error: "permission denied for schema public"
�? ודא שה-RLS policies נכונות או הוציא RLS

### Error: "relation bank_accounts does not exist"
�? בדוק שהטבלאות נוצרו - בדוק את SQL Editor בـ Supabase

### Error: "missing required field"
�? בדוק שמילאת את כל ה-GitHub Secrets הנדרשים

## 🎉 Next Steps

לאחר סיום:
1. הפעילו את ה-workflow "List Accounts" בשביל לבדוק שהכל תקין
2. כללו בדוקומנטציה שלכם את ה-account IDs שנוצרים
3. הגדרו לוח זמנים עבור סריקות יומיות
