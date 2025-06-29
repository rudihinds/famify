import { supabase } from '../lib/supabase';

interface CreateSequenceInput {
  childId: string;
  parentId: string;
  period: '1week' | '2weeks' | '1month' | 'ongoing';
  startDate: string;
  budget: number;
  budgetFamcoins: number;
  currencyCode: string;
  groups: Array<{
    id: string;
    name: string;
    activeDays: number[];
  }>;
  selectedTasksByGroup: Record<string, string[]>;
}

interface TaskInstance {
  template_id: string;
  group_id: string;
  sequence_id: string;
  famcoin_value: number;
  photo_proof_required: boolean;
  effort_score: number | null;
  is_bonus_task: boolean;
}

class SequenceService {
  /**
   * Map period values from Redux to database
   */
  private mapPeriodToType(period: string): string {
    const periodMap: Record<string, string> = {
      '1week': 'weekly',
      '2weeks': 'fortnightly',
      '1month': 'monthly',
    };
    return periodMap[period] || 'weekly';
  }

  /**
   * Calculate end date based on period
   */
  private calculateEndDate(startDate: string, period: string): string {
    const start = new Date(startDate);
    const end = new Date(start);

    switch (period) {
      case '1week':
        end.setDate(start.getDate() + 7);
        break;
      case '2weeks':
        end.setDate(start.getDate() + 14);
        break;
      case '1month':
        end.setMonth(start.getMonth() + 1);
        break;
      default:
        // For ongoing, set a far future date
        end.setFullYear(start.getFullYear() + 10);
    }

    return end.toISOString().split('T')[0];
  }

  /**
   * Generate a name for the sequence
   */
  private generateSequenceName(startDate: string, period: string): string {
    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    if (period === '1week') {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `Week of ${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    } else if (period === '2weeks') {
      const end = new Date(start);
      end.setDate(start.getDate() + 13);
      return `Fortnight ${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    } else if (period === '1month') {
      return `Month of ${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    
    return `Ongoing from ${start.toLocaleDateString('en-US', options)}`;
  }

  /**
   * Calculate FAMCOIN value per task
   */
  private calculateFamcoinPerTask(
    totalFamcoins: number,
    groups: CreateSequenceInput['groups'],
    selectedTasksByGroup: CreateSequenceInput['selectedTasksByGroup'],
    period: string
  ): number {
    // Calculate total task completions
    let totalCompletions = 0;
    
    groups.forEach(group => {
      const tasksInGroup = selectedTasksByGroup[group.id]?.length || 0;
      const daysPerWeek = group.activeDays.length;
      
      // Calculate weeks based on period
      let weeks = 1;
      if (period === '2weeks') weeks = 2;
      else if (period === '1month') weeks = 4.34; // Average weeks in a month
      
      totalCompletions += tasksInGroup * daysPerWeek * weeks;
    });

    // Divide total FAMCOINS by completions, round down
    return totalCompletions > 0 ? Math.floor(totalFamcoins / totalCompletions) : 0;
  }

  /**
   * Generate task completion dates for a group
   */
  private generateCompletionDates(
    startDate: string,
    endDate: string,
    activeDays: number[]
  ): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      // getDay() returns 0 for Sunday, but our schema uses 1-7 (Mon-Sun)
      const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
      
      if (activeDays.includes(dayOfWeek)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Create a new sequence with all related data
   */
  async createSequence(input: CreateSequenceInput): Promise<{ sequenceId: string }> {
    try {
      // 1. Create the sequence record
      const sequenceName = this.generateSequenceName(input.startDate, input.period);
      const endDate = this.calculateEndDate(input.startDate, input.period);
      const sequenceType = this.mapPeriodToType(input.period);

      const { data: sequence, error: sequenceError } = await supabase
        .from('sequences')
        .insert({
          child_id: input.childId,
          name: sequenceName,
          type: sequenceType,
          start_date: input.startDate,
          end_date: endDate,
          budget_currency: input.budget,
          budget_famcoins: input.budgetFamcoins,
          currency_code: input.currencyCode,
          status: 'active',
        })
        .select()
        .single();

      if (sequenceError) {
        console.error('Error creating sequence:', sequenceError);
        throw new Error(sequenceError.message);
      }

      const sequenceId = sequence.id;

      // 2. Create groups
      const groupsToInsert = input.groups.map(group => ({
        sequence_id: sequenceId,
        name: group.name,
        active_days: group.activeDays,
      }));

      const { data: createdGroups, error: groupsError } = await supabase
        .from('groups')
        .insert(groupsToInsert)
        .select();

      if (groupsError) {
        console.error('Error creating groups:', groupsError);
        throw new Error(groupsError.message);
      }

      // 3. Calculate FAMCOIN per task
      const famcoinPerTask = this.calculateFamcoinPerTask(
        input.budgetFamcoins,
        input.groups,
        input.selectedTasksByGroup,
        input.period
      );

      // 4. Fetch task templates to get their properties
      const allTaskIds = Object.values(input.selectedTasksByGroup).flat();
      const { data: templates, error: templatesError } = await supabase
        .from('task_templates')
        .select('id, photo_proof_required, effort_score')
        .in('id', allTaskIds);

      if (templatesError) {
        console.error('Error fetching templates:', templatesError);
        throw new Error(templatesError.message);
      }

      const templateMap = new Map(templates.map(t => [t.id, t]));

      // 5. Create task instances
      const taskInstances: TaskInstance[] = [];
      
      createdGroups.forEach((group, index) => {
        const originalGroupId = input.groups[index].id;
        const selectedTasks = input.selectedTasksByGroup[originalGroupId] || [];
        
        selectedTasks.forEach(taskId => {
          const template = templateMap.get(taskId);
          if (template) {
            taskInstances.push({
              template_id: taskId,
              group_id: group.id,
              sequence_id: sequenceId,
              famcoin_value: famcoinPerTask,
              photo_proof_required: template.photo_proof_required,
              effort_score: template.effort_score,
              is_bonus_task: false,
            });
          }
        });
      });

      const { data: createdInstances, error: instancesError } = await supabase
        .from('task_instances')
        .insert(taskInstances)
        .select();

      if (instancesError) {
        console.error('Error creating task instances:', instancesError);
        throw new Error(instancesError.message);
      }

      // 6. Create task completions for each instance and active day
      const completions: any[] = [];
      
      createdInstances.forEach((instance, idx) => {
        // Find which group this instance belongs to
        const groupId = instance.group_id;
        const group = createdGroups.find(g => g.id === groupId);
        if (!group) return;

        // Generate dates for this group's active days
        const dates = this.generateCompletionDates(
          input.startDate,
          endDate,
          group.active_days
        );

        // Create completion records
        dates.forEach(date => {
          completions.push({
            task_instance_id: instance.id,
            child_id: input.childId,
            due_date: date,
            status: 'pending',
            famcoins_earned: 0,
          });
        });
      });

      if (completions.length > 0) {
        const { error: completionsError } = await supabase
          .from('task_completions')
          .insert(completions);

        if (completionsError) {
          console.error('Error creating task completions:', completionsError);
          throw new Error(completionsError.message);
        }
      }

      return { sequenceId };
    } catch (error: any) {
      console.error('Failed to create sequence:', error);
      throw error;
    }
  }

  /**
   * Check if child has an active sequence
   */
  async checkActiveSequence(childId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('sequences')
      .select('id')
      .eq('child_id', childId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking active sequence:', error);
      throw error;
    }

    return !!data;
  }

  async getActiveSequences(parentId: string) {
    // Fetch all active sequences for a parent's children
    const today = new Date().toISOString().split('T')[0];
    
    const { data: sequences, error } = await supabase
      .from('sequences')
      .select(`
        *,
        children!inner(id, name, parent_id),
        task_completions(
          id,
          due_date,
          completed_at,
          approved_at,
          famcoins_earned,
          task_instances!inner(
            id,
            famcoin_value,
            task_templates!inner(
              name,
              description
            ),
            groups!inner(
              name
            )
          )
        )
      `)
      .eq('children.parent_id', parentId)
      .eq('status', 'active')
      .gte('end_date', today)
      .lte('start_date', today);

    if (error) {
      console.error('Error fetching active sequences:', error);
      throw error;
    }

    // Transform the data to match our Redux state shape
    return sequences.map(seq => {
      const todaysTasks = seq.task_completions
        .filter(tc => tc.due_date === today)
        .map(tc => ({
          id: tc.id,
          taskInstanceId: tc.task_instances.id,
          taskName: tc.task_instances.task_templates.name,
          childId: seq.child_id,
          dueDate: tc.due_date,
          completedAt: tc.completed_at,
          approvedAt: tc.approved_at,
          famcoinsEarned: tc.famcoins_earned || tc.task_instances.famcoin_value,
          groupName: tc.task_instances.groups.name,
        }));

      const completedTasks = seq.task_completions
        .filter(tc => tc.completed_at !== null).length;
      
      const totalTasks = seq.task_completions.length;

      return {
        id: seq.id,
        childId: seq.child_id,
        childName: seq.children.name,
        period: seq.period,
        startDate: seq.start_date,
        endDate: seq.end_date,
        budgetCurrency: seq.budget_currency,
        budgetFamcoins: seq.budget_famcoins,
        status: seq.status,
        totalTasks,
        completedTasks,
        todaysTasks,
      };
    });
  }
}

export const sequenceService = new SequenceService();