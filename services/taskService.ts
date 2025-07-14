import { supabase } from '../lib/supabase';
import { TaskCategory, TaskTemplate, CreateTaskTemplateInput, TaskCompletionView, TaskDetailView } from '../types/task';

class TaskService {
  /**
   * Fetch all task categories
   */
  async getTaskCategories(): Promise<TaskCategory[]> {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching task categories:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch task categories:', error);
      throw error;
    }
  }

  /**
   * Fetch all task templates with their categories
   */
  async getTaskTemplates(parentId?: string): Promise<TaskTemplate[]> {
    try {
      // Build query to get both system templates and user's custom templates
      let query = supabase
        .from('task_templates')
        .select(`
          *,
          category:task_categories(*)
        `)
        .order('category_id')
        .order('name');
      
      // Get system templates OR templates created by this parent
      if (parentId) {
        query = query.or(`is_system.eq.true,parent_id.eq.${parentId}`);
      } else {
        query = query.eq('is_system', true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching task templates:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch task templates:', error);
      throw error;
    }
  }

  /**
   * Create a custom task template for a parent
   */
  async createCustomTaskTemplate(
    parentId: string,
    input: CreateTaskTemplateInput
  ): Promise<TaskTemplate> {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          ...input,
          is_system: false,
          parent_id: parentId,
          usage_count: 0,
        })
        .select(`
          *,
          category:task_categories(*)
        `)
        .single();
      
      if (error) {
        console.error('Error creating custom task template:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to create custom task template:', error);
      throw error;
    }
  }

  /**
   * Get templates grouped by category for easier rendering
   */
  async getTemplatesByCategory(parentId?: string): Promise<Map<TaskCategory, TaskTemplate[]>> {
    try {
      const [categories, templates] = await Promise.all([
        this.getTaskCategories(),
        this.getTaskTemplates(parentId),
      ]);
      
      const templatesByCategory = new Map<TaskCategory, TaskTemplate[]>();
      
      // Initialize map with all categories
      categories.forEach(category => {
        templatesByCategory.set(category, []);
      });
      
      // Group templates by category
      templates.forEach(template => {
        const category = categories.find(c => c.id === template.category_id);
        if (category) {
          const categoryTemplates = templatesByCategory.get(category) || [];
          categoryTemplates.push(template);
          templatesByCategory.set(category, categoryTemplates);
        }
      });
      
      return templatesByCategory;
    } catch (error) {
      console.error('Failed to get templates by category:', error);
      throw error;
    }
  }

  /**
   * Search templates by name across all categories
   */
  filterTemplatesBySearch(
    templates: TaskTemplate[],
    searchQuery: string
  ): TaskTemplate[] {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return templates;
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query)
    );
  }

  /**
   * Get daily tasks for a child
   */
  async getDailyTasks(childId: string, date: string): Promise<TaskCompletionView[]> {
    try {
      // Get day of week (0-6, Sunday-Saturday)
      const dayOfWeek = new Date(date).getDay();
      
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          task_instance_id,
          due_date,
          status,
          photo_url,
          completed_at,
          rejection_reason,
          task_instances!inner (
            id,
            custom_name,
            custom_description,
            famcoin_value,
            photo_proof_required,
            effort_score,
            template_id,
            group_id,
            task_templates!inner (
              id,
              name,
              description,
              category_id,
              task_categories!inner (
                id,
                name,
                icon,
                color
              )
            ),
            groups!inner (
              id,
              name,
              active_days
            )
          )
        `)
        .eq('child_id', childId)
        .eq('due_date', date);
      
      if (error) {
        console.error('Error fetching daily tasks:', error);
        throw error;
      }
      
      // Filter by active days and transform to TaskCompletionView
      const tasksForDay = (data || [])
        .filter((task: any) => {
          const activeDays = task.task_instances?.groups?.active_days || [];
          return activeDays.includes(dayOfWeek);
        })
        .map((task: any) => ({
          id: task.id,
          taskInstanceId: task.task_instance_id,
          taskName: task.task_instances?.custom_name || task.task_instances?.task_templates?.name || '',
          customDescription: task.task_instances?.custom_description || task.task_instances?.task_templates?.description,
          groupName: task.task_instances?.groups?.name || '',
          famcoinValue: task.task_instances?.famcoin_value || 0,
          photoProofRequired: task.task_instances?.photo_proof_required || false,
          effortScore: task.task_instances?.effort_score || 0,
          status: task.status,
          photoUrl: task.photo_url,
          completedAt: task.completed_at,
          rejectionReason: task.rejection_reason,
          categoryIcon: task.task_instances?.task_templates?.task_categories?.icon || '',
          categoryColor: task.task_instances?.task_templates?.task_categories?.color || '#000000',
        }));
      
      // Sort by status priority
      const statusOrder = {
        'pending': 1,
        'parent_rejected': 2,
        'child_completed': 3,
        'parent_approved': 4,
        'excused': 5,
      };
      
      return tasksForDay.sort((a, b) => {
        const statusDiff = (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
        if (statusDiff !== 0) return statusDiff;
        return b.effortScore - a.effortScore;
      });
    } catch (error) {
      console.error('Failed to fetch daily tasks:', error);
      throw error;
    }
  }

  /**
   * Mark a task as completed by the child
   */
  async markTaskComplete(taskCompletionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_completions')
        .update({
          status: 'child_completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskCompletionId);
      
      if (error) {
        console.error('Error marking task complete:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark task complete:', error);
      throw error;
    }
  }

  /**
   * Upload photo proof for a task
   */
  async uploadTaskPhoto(
    taskCompletionId: string,
    photoBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Get task completion details to construct path
      const { data: taskData, error: fetchError } = await supabase
        .from('task_completions')
        .select(`
          id,
          child_id,
          task_instances!inner (
            id,
            groups!inner (
              id,
              sequences!inner (
                id,
                child_id,
                children!inner (
                  id,
                  parent_id
                )
              )
            )
          )
        `)
        .eq('id', taskCompletionId)
        .single();
      
      if (fetchError || !taskData) {
        throw new Error('Task completion not found');
      }
      
      const parentId = taskData.task_instances?.groups?.sequences?.children?.parent_id;
      const childId = taskData.child_id;
      const timestamp = Date.now();
      const fileName = `photo_${timestamp}.jpg`;
      const filePath = `task-photos/${parentId}/${childId}/${taskCompletionId}/${fileName}`;
      
      // Upload photo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-photos')
        .upload(filePath, photoBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-photos')
        .getPublicUrl(filePath);
      
      // Update task completion with photo URL
      const { error: updateError } = await supabase
        .from('task_completions')
        .update({ photo_url: publicUrl })
        .eq('id', taskCompletionId);
      
      if (updateError) {
        console.error('Error updating task with photo URL:', updateError);
        throw updateError;
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(100);
      }
      
      return publicUrl;
    } catch (error) {
      console.error('Failed to upload task photo:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific task
   */
  async getTaskDetails(taskCompletionId: string): Promise<TaskDetailView> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          *,
          task_instances!inner (
            *,
            task_templates!inner (
              *,
              task_categories!inner (*)
            ),
            groups!inner (
              *,
              sequences!inner (*)
            )
          )
        `)
        .eq('id', taskCompletionId)
        .single();
      
      if (error) {
        console.error('Error fetching task details:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Task not found');
      }
      
      // Transform to TaskDetailView
      return {
        id: data.id,
        taskInstanceId: data.task_instance_id,
        taskName: data.task_instances.custom_name || data.task_instances.task_templates.name,
        customDescription: data.task_instances.custom_description || data.task_instances.task_templates.description,
        groupName: data.task_instances.groups.name,
        famcoinValue: data.task_instances.famcoin_value,
        photoProofRequired: data.task_instances.photo_proof_required,
        effortScore: data.task_instances.effort_score,
        status: data.status,
        photoUrl: data.photo_url,
        completedAt: data.completed_at,
        rejectionReason: data.rejection_reason,
        categoryIcon: data.task_instances.task_templates.task_categories.icon,
        categoryColor: data.task_instances.task_templates.task_categories.color,
        templateId: data.task_instances.template_id,
        templateName: data.task_instances.task_templates.name,
        templateDescription: data.task_instances.task_templates.description,
        categoryName: data.task_instances.task_templates.task_categories.name,
        groupId: data.task_instances.group_id,
        sequenceId: data.task_instances.groups.sequence_id,
        dueDate: data.due_date,
        isBonusTask: data.task_instances.is_bonus_task || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Failed to get task details:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();