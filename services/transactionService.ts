import { supabase } from '../lib/supabase';

export interface FamcoinTransaction {
  id: string;
  child_id: string;
  amount: number;
  type: 'earned' | 'spent' | 'adjusted' | 'bonus';
  task_completion_id?: string;
  wishlist_item_id?: string;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateTransactionInput {
  childId: string;
  amount: number;
  type: 'earned' | 'spent' | 'adjusted' | 'bonus';
  taskCompletionId?: string;
  wishlistItemId?: string;
  reason?: string;
  createdBy?: string;
}

class TransactionService {
  /**
   * Create a pending transaction for task completion
   * Note: This creates the transaction but doesn't update the balance yet
   * Balance is updated when parent approves the task
   */
  async createPendingTransaction(
    childId: string,
    taskCompletionId: string,
    amount: number
  ): Promise<FamcoinTransaction> {
    try {
      const { data, error } = await supabase
        .from('famcoin_transactions')
        .insert({
          child_id: childId,
          amount: amount,
          type: 'earned',
          task_completion_id: taskCompletionId,
          reason: 'Task completion pending approval',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create pending transaction:', error);
      throw error;
    }
  }

  /**
   * Update child's FAMCOIN balance
   * This should be called after parent approval
   */
  async updateChildBalance(
    childId: string,
    amount: number,
    type: 'add' | 'subtract' = 'add'
  ): Promise<number> {
    try {
      // Get current balance
      const { data: child, error: fetchError } = await supabase
        .from('children')
        .select('famcoin_balance')
        .eq('id', childId)
        .single();

      if (fetchError || !child) {
        throw new Error('Child not found');
      }

      const currentBalance = child.famcoin_balance || 0;
      const newBalance = type === 'add' 
        ? currentBalance + amount 
        : Math.max(0, currentBalance - amount);

      // Update balance
      const { error: updateError } = await supabase
        .from('children')
        .update({ famcoin_balance: newBalance })
        .eq('id', childId);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        throw updateError;
      }

      return newBalance;
    } catch (error) {
      console.error('Failed to update child balance:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a child
   */
  async getTransactionHistory(
    childId: string,
    limit: number = 50
  ): Promise<FamcoinTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('famcoin_transactions')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transaction history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      throw error;
    }
  }

  /**
   * Complete a task with transaction
   * This combines task completion update with transaction creation
   */
  async completeTaskWithTransaction(
    taskCompletionId: string,
    childId: string,
    famcoinValue: number,
    photoUrl?: string
  ): Promise<{
    completion: any;
    transaction: FamcoinTransaction | null;
  }> {
    try {
      // First, fetch the task to validate the due date
      const { data: taskData, error: fetchError } = await supabase
        .from('task_completions')
        .select('due_date, status')
        .eq('id', taskCompletionId)
        .single();
      
      if (fetchError || !taskData) {
        throw new Error('Task not found');
      }
      
      // Validate that the task is not in the future
      const taskDate = new Date(taskData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate > today) {
        throw new Error('Cannot complete tasks scheduled for future dates');
      }
      
      // Validate task status
      if (taskData.status !== 'pending' && taskData.status !== 'parent_rejected') {
        throw new Error('Task cannot be completed in its current status');
      }
      
      // Update task completion status
      const updateData: any = {
        status: 'child_completed',
        completed_at: new Date().toISOString(),
      };

      if (photoUrl) {
        updateData.photo_url = photoUrl;
      }

      const { data: completion, error: completionError } = await supabase
        .from('task_completions')
        .update(updateData)
        .eq('id', taskCompletionId)
        .select()
        .single();

      if (completionError) {
        console.error('Error updating task completion:', completionError);
        throw completionError;
      }

      // Create pending transaction (will be confirmed on parent approval)
      // For now, we don't create the transaction until parent approves
      // This prevents FAMCOINs from being added before approval
      
      return {
        completion,
        transaction: null, // Transaction created on parent approval
      };
    } catch (error) {
      console.error('Failed to complete task with transaction:', error);
      throw error;
    }
  }

  /**
   * Calculate pending earnings for a child
   * (tasks completed but not yet approved)
   */
  async getPendingEarnings(childId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          task_instances (
            famcoin_value
          )
        `)
        .eq('child_id', childId)
        .eq('status', 'child_completed');

      if (error) {
        console.error('Error fetching pending earnings:', error);
        throw error;
      }

      const pendingAmount = (data || []).reduce((sum, completion) => {
        const famcoinValue = (completion as any).task_instances?.famcoin_value || 0;
        return sum + famcoinValue;
      }, 0);

      return pendingAmount;
    } catch (error) {
      console.error('Failed to calculate pending earnings:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();