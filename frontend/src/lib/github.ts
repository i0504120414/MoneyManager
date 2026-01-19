// GitHub Actions API client

const GITHUB_OWNER = 'i0504120414';
const GITHUB_REPO = 'MoneyManager';

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export async function triggerWorkflow(
  workflowId: string,
  inputs: Record<string, string> = {},
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs,
        }),
      }
    );

    if (response.status === 204) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error: `GitHub API error: ${response.status} - ${error}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getWorkflowRuns(token: string): Promise<WorkflowRun[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return data.workflow_runs || [];
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    return [];
  }
}

export const BANKS = [
  { id: 'hapoalim', name: 'בנק הפועלים', fields: ['userCode', 'password'] },
  { id: 'leumi', name: 'בנק לאומי', fields: ['username', 'password'] },
  { id: 'discount', name: 'בנק דיסקונט', fields: ['id', 'password', 'num'] },
  { id: 'mizrahi', name: 'מזרחי טפחות', fields: ['username', 'password'] },
  { id: 'isracard', name: 'ישראכרט', fields: ['id', 'card6Digits', 'password'] },
  { id: 'visaCal', name: 'ויזה כאל', fields: ['username', 'password'] },
  { id: 'max', name: 'מקס', fields: ['username', 'password'] },
  { id: 'amex', name: 'אמריקן אקספרס', fields: ['id', 'card6Digits', 'password'] },
  { id: 'behatsdaa', name: 'בהצדעה', fields: ['id', 'password'] },
  { id: 'otsarHahayal', name: 'אוצר החייל', fields: ['username', 'password'] },
  { id: 'beinleumi', name: 'הבינלאומי', fields: ['username', 'password'] },
];

export const FIELD_LABELS: Record<string, string> = {
  userCode: 'קוד משתמש',
  username: 'שם משתמש',
  id: 'תעודת זהות',
  password: 'סיסמה',
  num: 'מספר סניף/חשבון',
  card6Digits: '6 ספרות אחרונות של הכרטיס',
};
