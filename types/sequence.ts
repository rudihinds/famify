/**
 * Type definitions for sequences
 */

export interface Sequence {
  id: string;
  parent_id: string;
  child_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  type: 'weekly' | 'fortnightly' | 'monthly';
  currency_code: string;
  budget_currency: number;
  budget_famcoins: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  groups?: SequenceGroup[];
}

export interface SequenceGroup {
  id: string;
  sequence_id: string;
  name: string;
  active_days: number[];
  created_at: string;
  task_instances?: TaskInstance[];
}

export interface TaskInstance {
  id: string;
  template_id: string;
  group_id: string;
  sequence_id: string;
  famcoin_value: number;
  photo_proof_required: boolean;
  effort_score: number;
  is_bonus_task: boolean;
  created_at: string;
  task_completions?: TaskCompletion[];
}

export interface TaskCompletion {
  id: string;
  task_instance_id: string;
  child_id: string;
  due_date: string;
  completed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  famcoins_earned: number;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateSequenceInput {
  childId: string;
  parentId: string;
  name: string;
  startDate: string;
  endDate: string;
  period: '1week' | '2weeks' | '1month';
  currencyCode: string;
  budget: number;
  budgetFamcoins: number;
  groups: Array<{
    id: string;
    name: string;
    activeDays: number[];
    taskIds: string[];
  }>;
}