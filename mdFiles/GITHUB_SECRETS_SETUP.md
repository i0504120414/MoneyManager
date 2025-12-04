# 🔐 הגדרת GitHub Secrets

## איפה להכניס את הפרטים?

כל פרטי ה-Supabase צריכים להיות ממוסדים ב-GitHub Secrets כדי שה-Workflows יוכלו להשתמש בהם בביטחון.

## שלבים:

### 1️⃣ כנסו לריפוזיטוריום שלכם ב-GitHub

```
https://github.com/YOUR_USERNAME/MoneyManager
```

### 2️⃣ עברו ל-Settings

![Settings Location](./docs/settings-location.png)

- כנסו לעמוד הריפוזיטוריום
- לחצו על **Settings** בתפריט העליון

### 3️⃣ עברו ל-Secrets and variables

בתפריט הצד שמאל:

```
Settings → Secrets and variables → Actions
```

### 4️⃣ הוסיפו Secret חדש

לחצו על **"New repository secret"** בחלק הימני

### 5️⃣ הוסיפו את הערכים הבאים

#### שדה 1️⃣: `SUPABASE_URL`

**Name:** 
```
SUPABASE_URL
```

**Value:** 
```
https://xxxxx.supabase.co
```

כיצד למצוא:
1. כנסו ל-[Supabase](https://supabase.com)
2. בחרו את ה-Project שלכם
3. עברו ל-**Settings** → **API**
4. עתקו את **Project URL**

---

#### שדה 2️⃣: `SUPABASE_KEY`

**Name:**
```
SUPABASE_KEY
```

**Value:**
```
eyJhbGc... (anon key)
```

כיצד למצוא:
1. באותו מסך **Settings** → **API** ב-Supabase
2. עתקו את **anon key** (לא את `service_role key`)

---

## ✅ בדיקה

אחרי שהוספתם את ה-Secrets:

1. כנסו לתבנית **Actions** בריפוזיטוריום
2. בחרו **List Accounts**
3. לחצו **Run workflow**

אם הכל מוגדר נכון, ה-Workflow צריך להתחיל ולהעלות artifacts.

---

## 🚨 נקודות חשובות

### ⚠️ בטיחות

- **אל תחשפו את ה-Keys בקוד!**
- מעולם לא תתחיוו את ה-Secrets ב-`.env` בקובץ הקוד
- GitHub Secrets מוצפנים ואי אפשר לראות אותם אחרי ההוספה

### 🔄 שינוי Secrets

אם צריך לשנות Secret:

1. לחצו על Secret הקיים
2. לחצו **Update**
3. הכניסו את הערך החדש

### 🗑️ מחיקת Secret

1. לחצו על Secret
2. לחצו **Delete** בתחתית

---

## 📋 רשימת בדיקה

- [ ] הוספת `SUPABASE_URL`
- [ ] הוספת `SUPABASE_KEY`
- [ ] בדיקה עם "List Accounts" Workflow
- [ ] כל הנתונים נמצאים בנכון

---

## 🎯 שלב הבא

אחרי הגדרת ה-Secrets:

1. 👉 עברו לתבנית **Actions**
2. 👉 בחרו **Add Account**
3. 👉 בחרו בנק ומלאו את הנתונים
4. 👉 לחצו **Run workflow**

✨ וזהו! החשבון שלכם כבר נוצר בעבר בטבלה שלכם ב-Supabase!
