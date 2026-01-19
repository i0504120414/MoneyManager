# Migration: Fix Identifier Column Type

## Problem
The `identifier` column in the `transactions` table was defined as `INT` but transaction identifiers from Visa Cal can exceed the maximum integer value (2,147,483,647).

Example failing value: `28890890521`

## Solution
Change the column type from `INT` to `BIGINT`.

## Run this in Supabase SQL Editor

```sql
-- Fix identifier column type from INT to BIGINT
-- This allows transaction IDs up to 9,223,372,036,854,775,807

ALTER TABLE transactions 
ALTER COLUMN identifier TYPE BIGINT;
```

## Verification
After running the migration, verify with:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'identifier';
```

Expected result: `data_type` should be `bigint`
