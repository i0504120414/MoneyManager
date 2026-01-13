import { supabase } from '../lib/supabase';

// Categorize a transaction based on description
export const categorizeTransaction = async (transactionId, description) => {
  // 1. Fetch rules
  const { data: rules } = await supabase
    .from('category_rules')
    .select('*');

  if (!rules) return;

  let matchedCategoryId = null;

  // 2. Find match
  for (const rule of rules) {
    if (description.includes(rule.keyword)) {
      matchedCategoryId = rule.category_id;
      break;
    }
  }

  // 3. Update transaction
  if (matchedCategoryId) {
    await supabase
      .from('transactions')
      .update({ category_id: matchedCategoryId })
      .eq('id', transactionId);
  }
};
