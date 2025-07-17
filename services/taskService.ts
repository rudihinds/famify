import { supabase } from '../lib/supabase';
import { TaskCategory, TaskTemplate, CreateTaskTemplateInput, TaskCompletionView, TaskDetailView } from '../types/task';

// Storage constants
const TASK_PHOTOS_BUCKET = 'task-photos';

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
      console.log('[getDailyTasks] Starting query for:', { childId, date });
      
      // Get day of week - map to match schema (1-7, Mon-Sun)
      const dayOfWeek = new Date(date).getDay() === 0 ? 7 : new Date(date).getDay();
      
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
            groups!inner (*)
          )
        `)
        .eq('child_id', childId)
        .eq('due_date', date);
      
      if (error) {
        console.error('Error fetching daily tasks:', error);
        throw error;
      }
      
      console.log('[getDailyTasks] Query returned', data?.length || 0, 'records for', date);
      
      
      // Log raw data for debugging
      console.log('[getDailyTasks] Raw tasks from DB:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[getDailyTasks] Sample task:', {
          id: data[0].id,
          status: data[0].status,
          rejection_reason: data[0].rejection_reason,
          feedback: data[0].feedback
        });
      }
      
      // Filter by active days and transform to TaskCompletionView
      const tasksForDay = (data || [])
        .filter((task: any) => {
          // Check both nested and flat structure formats
          const activeDays = task.task_instances?.groups?.active_days || 
                           task['task_instances.groups.active_days'] || 
                           [];
          const included = activeDays.includes(dayOfWeek);
          console.log('[getDailyTasks] Task active days check:', { 
            taskId: task.id, 
            activeDays, 
            dayOfWeek, 
            included 
          });
          return included;
        })
        .map((task: any) => {
          // Handle both nested and flat structure formats
          const ti = task.task_instances || {};
          const tt = ti.task_templates || {};
          const tc = tt.task_categories || {};
          const g = ti.groups || {};
          
          return {
            id: task.id,
            taskInstanceId: task.task_instance_id,
            taskName: ti.custom_name || tt.name || 
                     task['task_instances.custom_name'] || 
                     task['task_instances.task_templates.name'] || '',
            customDescription: ti.custom_description || tt.description ||
                             task['task_instances.custom_description'] || 
                             task['task_instances.task_templates.description'],
            groupName: g.name || task['task_instances.groups.name'] || '',
            famcoinValue: ti.famcoin_value || task['task_instances.famcoin_value'] || 0,
            photoProofRequired: ti.photo_proof_required || task['task_instances.photo_proof_required'] || false,
            effortScore: ti.effort_score || task['task_instances.effort_score'] || 0,
            status: task.status,
            photoUrl: task.photo_url,
            completedAt: task.completed_at,
            rejectionReason: task.rejection_reason,
            feedback: task.feedback,
            categoryIcon: tc.icon || task['task_instances.task_templates.task_categories.icon'] || '',
            categoryColor: tc.color || task['task_instances.task_templates.task_categories.color'] || '#000000',
            dueDate: task.due_date || date, // fallback to the date parameter if due_date is missing
          };
        });
      
      // Sort by status priority
      const statusOrder: Record<string, number> = {
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
    photoArrayBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      console.log('[uploadTaskPhoto] Starting upload for task:', taskCompletionId);
      
      // Get task completion details
      const { data: taskData, error: fetchError } = await supabase
        .from('task_completions')
        .select('id, child_id')
        .eq('id', taskCompletionId)
        .single();
      
      if (fetchError || !taskData) {
        console.error('Error fetching task completion:', fetchError);
        throw new Error('Task completion not found');
      }
      
      const childId = taskData.child_id;
      
      // Get parent_id from children table
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('parent_id')
        .eq('id', childId)
        .single();
      
      if (childError || !childData) {
        console.error('Error fetching child data:', childError);
        throw new Error('Child not found');
      }
      
      const parentId = childData.parent_id;
      const timestamp = Date.now();
      
      // Default to JPEG for ArrayBuffer uploads
      const fileName = `photo_${timestamp}.jpg`;
      
      // Include bucket name in the path - this is how Supabase expects it for public URLs to work
      const filePath = `${TASK_PHOTOS_BUCKET}/${parentId}/${childId}/${taskCompletionId}/${fileName}`;
      
      console.log('[uploadTaskPhoto service] Received ArrayBuffer:', {
        byteLength: photoArrayBuffer.byteLength,
        constructor: photoArrayBuffer.constructor.name
      });
      
      console.log('[uploadTaskPhoto service] Bucket:', TASK_PHOTOS_BUCKET);
      console.log('[uploadTaskPhoto service] Upload path:', filePath);
      
      // Set content type for JPEG
      const contentType = 'image/jpeg';
      console.log('[uploadTaskPhoto service] Content type for upload:', contentType);
      
      // Validate ArrayBuffer before upload
      if (photoArrayBuffer.byteLength === 0) {
        console.error('[uploadTaskPhoto service] CRITICAL: ArrayBuffer size is 0 before upload!');
        throw new Error('ArrayBuffer is empty');
      }
      
      console.log('[uploadTaskPhoto service] Calling supabase.storage.upload...');
      
      // Upload ArrayBuffer directly
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(TASK_PHOTOS_BUCKET)
        .upload(filePath, photoArrayBuffer, {
          contentType: contentType,
          upsert: true, // Allow overwriting for retakes
        });
      
      console.log('[uploadTaskPhoto service] Upload result:', {
        error: uploadError,
        data: uploadData
      });
      
      let photoUrl: string;
      
      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      } else {
        // Get public URL from storage
        const { data: { publicUrl } } = supabase.storage
          .from(TASK_PHOTOS_BUCKET)
          .getPublicUrl(filePath);
        
        photoUrl = publicUrl;
        console.log('[uploadTaskPhoto] Successfully uploaded to storage, URL:', photoUrl);
      }
      
      // Update task completion with photo URL
      const { error: updateError } = await supabase
        .from('task_completions')
        .update({ photo_url: photoUrl })
        .eq('id', taskCompletionId);
      
      if (updateError) {
        console.error('Error updating task with photo URL:', updateError);
        throw updateError;
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(100);
      }
      
      return photoUrl;
    } catch (error) {
      console.error('Failed to upload task photo:', error);
      throw error;
    }
  }

  /**
   * Get pending task completions for parent review
   */
  async getPendingCompletions(parentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          due_date,
          completed_at,
          status,
          photo_url,
          child_id,
          children!inner (
            id,
            name,
            avatar_url,
            parent_id
          ),
          task_instances!inner (
            id,
            famcoin_value,
            photo_proof_required,
            effort_score,
            task_templates!inner (
              id,
              name,
              description
            )
          )
        `)
        .eq('status', 'child_completed')
        .eq('children.parent_id', parentId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending completions:', error);
        throw error;
      }

      // Transform the data to a flatter structure
      return (data || []).map(completion => ({
        id: completion.id,
        taskName: completion.task_instances.task_templates.name,
        taskDescription: completion.task_instances.task_templates.description,
        childId: completion.child_id,
        childName: completion.children.name,
        childAvatar: completion.children.avatar_url,
        famcoinValue: completion.task_instances.famcoin_value,
        effortScore: completion.task_instances.effort_score,
        completedAt: completion.completed_at,
        dueDate: completion.due_date,
        photoUrl: completion.photo_url,
        photoRequired: completion.task_instances.photo_proof_required,
        status: completion.status,
      }));
    } catch (error) {
      console.error('Failed to fetch pending completions:', error);
      throw error;
    }
  }

  /**
   * Approve a task completion
   */
  async approveTaskCompletion(
    taskCompletionId: string, 
    approverId: string,
    feedback?: string
  ): Promise<{ completion: any; transaction: any }> {
    try {
      // Start a transaction to ensure atomicity
      const { data: completion, error: completionError } = await supabase
        .from('task_completions')
        .update({
          status: 'parent_approved',
          approved_at: new Date().toISOString(),
          approved_by: approverId,
          feedback: feedback || null,
        })
        .eq('id', taskCompletionId)
        .select(`
          *,
          children (
            id,
            famcoin_balance
          ),
          task_instances (
            famcoin_value
          )
        `)
        .single();

      if (completionError) {
        console.error('Error approving task:', completionError);
        throw completionError;
      }

      // Create the famcoin transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('famcoin_transactions')
        .insert({
          child_id: completion.child_id,
          amount: completion.task_instances.famcoin_value,
          type: 'earned',
          task_completion_id: taskCompletionId,
          reason: 'Task approved by parent',
          created_by: approverId,
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        throw transactionError;
      }

      // Update child's balance
      const newBalance = (completion.children.famcoin_balance || 0) + completion.task_instances.famcoin_value;
      const { error: balanceError } = await supabase
        .from('children')
        .update({ famcoin_balance: newBalance })
        .eq('id', completion.child_id);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        throw balanceError;
      }

      return { completion, transaction };
    } catch (error) {
      console.error('Failed to approve task completion:', error);
      throw error;
    }
  }

  /**
   * Reject a task completion
   */
  async rejectTaskCompletion(
    taskCompletionId: string, 
    rejectedBy: string,
    reason: string
  ): Promise<any> {
    try {
      console.log('[rejectTaskCompletion] Starting rejection:', {
        taskCompletionId,
        rejectedBy,
        reason
      });

      const { data, error } = await supabase
        .from('task_completions')
        .update({
          status: 'parent_rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: rejectedBy,
          rejection_reason: reason,
          // Clear the completed_at so child can retry
          completed_at: null,
          photo_url: null,
        })
        .eq('id', taskCompletionId)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting task:', error);
        throw error;
      }

      console.log('[rejectTaskCompletion] Task rejected successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to reject task completion:', error);
      throw error;
    }
  }

  /**
   * Get all rejected tasks for a child (across all dates)
   */
  async getAllRejectedTasks(childId: string): Promise<TaskCompletionView[]> {
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
            groups!inner (*)
          )
        `)
        .eq('child_id', childId)
        .eq('status', 'parent_rejected')
        .order('due_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching rejected tasks:', error);
        throw error;
      }
      
      console.log('[getAllRejectedTasks] Found', data?.length || 0, 'rejected tasks');
      
      // Transform to TaskCompletionView format
      return (data || []).map((task: any) => {
        const ti = task.task_instances || {};
        const tt = ti.task_templates || {};
        const tc = tt.task_categories || {};
        const g = ti.groups || {};
        
        return {
          id: task.id,
          taskInstanceId: task.task_instance_id,
          taskName: ti.custom_name || tt.name || '',
          customDescription: ti.custom_description || tt.description,
          groupName: g.name || '',
          famcoinValue: ti.famcoin_value || 0,
          photoProofRequired: ti.photo_proof_required || false,
          effortScore: ti.effort_score || 0,
          status: task.status,
          photoUrl: task.photo_url,
          completedAt: task.completed_at,
          rejectionReason: task.rejection_reason,
          feedback: task.feedback,
          categoryIcon: tc.icon || '',
          categoryColor: tc.color || '#000000',
          dueDate: task.due_date,
        };
      });
    } catch (error) {
      console.error('Failed to fetch rejected tasks:', error);
      throw error;
    }
  }

  /**
   * Get count of pending task completions
   */
  async getPendingCompletionsCount(parentId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          children!inner(parent_id)
        `, { count: 'exact', head: true })
        .eq('status', 'child_completed')
        .eq('children.parent_id', parentId);

      if (error) {
        console.error('Error fetching pending count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to fetch pending completions count:', error);
      throw error;
    }
  }

  /**
   * Get parent's review tasks for a specific date
   * Returns all tasks (pending, approved, rejected) for children of this parent
   */
  async getParentReviewTasksByDate(parentId: string, date: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          due_date,
          completed_at,
          status,
          photo_url,
          rejection_reason,
          feedback,
          approved_at,
          child_id,
          children!inner (
            id,
            name,
            avatar_url,
            parent_id
          ),
          task_instances!inner (
            id,
            famcoin_value,
            photo_proof_required,
            effort_score,
            custom_name,
            custom_description,
            task_templates!inner (
              id,
              name,
              description,
              task_categories!inner (
                id,
                name,
                icon,
                color
              )
            ),
            groups!inner (
              id,
              name
            )
          )
        `)
        .eq('children.parent_id', parentId)
        .eq('due_date', date)
        .order('status', { ascending: true })
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching parent review tasks:', error);
        throw error;
      }

      // Transform the data to a flatter structure
      return (data || []).map(completion => ({
        id: completion.id,
        taskName: completion.task_instances.custom_name || 
                  completion.task_instances.task_templates.name,
        taskDescription: completion.task_instances.custom_description || 
                        completion.task_instances.task_templates.description,
        groupName: completion.task_instances.groups.name,
        categoryName: completion.task_instances.task_templates.task_categories.name,
        categoryIcon: completion.task_instances.task_templates.task_categories.icon,
        categoryColor: completion.task_instances.task_templates.task_categories.color,
        childId: completion.child_id,
        childName: completion.children.name,
        childAvatar: completion.children.avatar_url,
        famcoinValue: completion.task_instances.famcoin_value,
        effortScore: completion.task_instances.effort_score,
        completedAt: completion.completed_at,
        approvedAt: completion.approved_at,
        dueDate: completion.due_date,
        photoUrl: completion.photo_url,
        photoRequired: completion.task_instances.photo_proof_required,
        status: completion.status,
        rejectionReason: completion.rejection_reason,
        feedback: completion.feedback,
      }));
    } catch (error) {
      console.error('Failed to fetch parent review tasks by date:', error);
      throw error;
    }
  }

  /**
   * Get all rejected tasks for a parent (across all dates)
   */
  async getParentRejectedTasks(parentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          due_date,
          completed_at,
          status,
          photo_url,
          rejection_reason,
          feedback,
          rejected_at,
          child_id,
          children!inner (
            id,
            name,
            avatar_url,
            parent_id
          ),
          task_instances!inner (
            id,
            famcoin_value,
            photo_proof_required,
            effort_score,
            custom_name,
            custom_description,
            task_templates!inner (
              id,
              name,
              description,
              task_categories!inner (
                id,
                name,
                icon,
                color
              )
            ),
            groups!inner (
              id,
              name
            )
          )
        `)
        .eq('children.parent_id', parentId)
        .eq('status', 'parent_rejected')
        .order('rejected_at', { ascending: false });

      if (error) {
        console.error('Error fetching parent rejected tasks:', error);
        throw error;
      }

      // Transform the data to a flatter structure
      return (data || []).map(completion => ({
        id: completion.id,
        taskName: completion.task_instances.custom_name || 
                  completion.task_instances.task_templates.name,
        taskDescription: completion.task_instances.custom_description || 
                        completion.task_instances.task_templates.description,
        groupName: completion.task_instances.groups.name,
        categoryName: completion.task_instances.task_templates.task_categories.name,
        categoryIcon: completion.task_instances.task_templates.task_categories.icon,
        categoryColor: completion.task_instances.task_templates.task_categories.color,
        childId: completion.child_id,
        childName: completion.children.name,
        childAvatar: completion.children.avatar_url,
        famcoinValue: completion.task_instances.famcoin_value,
        effortScore: completion.task_instances.effort_score,
        completedAt: completion.completed_at,
        rejectedAt: completion.rejected_at,
        dueDate: completion.due_date,
        photoUrl: completion.photo_url,
        photoRequired: completion.task_instances.photo_proof_required,
        status: completion.status,
        rejectionReason: completion.rejection_reason,
        feedback: completion.feedback,
      }));
    } catch (error) {
      console.error('Failed to fetch parent rejected tasks:', error);
      throw error;
    }
  }

  /**
   * Get all pending approval tasks for a parent (across all dates)
   */
  async getParentPendingApprovalTasks(parentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          due_date,
          completed_at,
          status,
          photo_url,
          child_id,
          children!inner (
            id,
            name,
            avatar_url,
            parent_id
          ),
          task_instances!inner (
            id,
            famcoin_value,
            photo_proof_required,
            effort_score,
            custom_name,
            custom_description,
            task_templates!inner (
              id,
              name,
              description,
              task_categories!inner (
                id,
                name,
                icon,
                color
              )
            ),
            groups!inner (
              id,
              name
            )
          )
        `)
        .eq('children.parent_id', parentId)
        .eq('status', 'child_completed')
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching parent pending approval tasks:', error);
        throw error;
      }

      // Transform the data to a flatter structure
      return (data || []).map(completion => ({
        id: completion.id,
        taskName: completion.task_instances.custom_name || 
                  completion.task_instances.task_templates.name,
        taskDescription: completion.task_instances.custom_description || 
                        completion.task_instances.task_templates.description,
        groupName: completion.task_instances.groups.name,
        categoryName: completion.task_instances.task_templates.task_categories.name,
        categoryIcon: completion.task_instances.task_templates.task_categories.icon,
        categoryColor: completion.task_instances.task_templates.task_categories.color,
        childId: completion.child_id,
        childName: completion.children.name,
        childAvatar: completion.children.avatar_url,
        famcoinValue: completion.task_instances.famcoin_value,
        effortScore: completion.task_instances.effort_score,
        completedAt: completion.completed_at,
        dueDate: completion.due_date,
        photoUrl: completion.photo_url,
        photoRequired: completion.task_instances.photo_proof_required,
        status: completion.status,
      }));
    } catch (error) {
      console.error('Failed to fetch parent pending approval tasks:', error);
      throw error;
    }
  }

  /**
   * Get task statistics for parent review screen
   */
  async getParentReviewStats(
    parentId: string,
    date: string
  ): Promise<{
    pending: number;
    awaitingApproval: number;
    rejected: number;
    approved: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          status,
          children!inner (parent_id)
        `)
        .eq('children.parent_id', parentId)
        .eq('due_date', date);

      if (error) {
        console.error('Error fetching parent review stats:', error);
        throw error;
      }

      const stats = {
        pending: 0,
        awaitingApproval: 0,
        rejected: 0,
        approved: 0,
        total: 0,
      };

      (data || []).forEach(task => {
        stats.total++;
        switch (task.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'child_completed':
            stats.awaitingApproval++;
            break;
          case 'parent_rejected':
            stats.rejected++;
            break;
          case 'parent_approved':
            stats.approved++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to fetch parent review stats:', error);
      throw error;
    }
  }

  /**
   * Mark a task as completed on behalf of a child
   */
  async completeTaskOnBehalf(
    taskCompletionId: string,
    parentId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_completions')
        .update({
          status: 'child_completed',
          completed_at: new Date().toISOString(),
          completed_by: parentId, // Track who completed it
        })
        .eq('id', taskCompletionId);
      
      if (error) {
        console.error('Error completing task on behalf:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to complete task on behalf:', error);
      throw error;
    }
  }

  /**
   * Bulk approve multiple task completions
   */
  async bulkApproveTaskCompletions(
    taskIds: string[],
    approverId: string,
    feedback?: string
  ): Promise<{
    successful: string[];
    failed: { id: string; error: string }[];
    totalFamcoinsAwarded: number;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
      totalFamcoinsAwarded: 0,
    };

    // Process each task
    for (const taskId of taskIds) {
      try {
        const result = await this.approveTaskCompletion(taskId, approverId, feedback);
        results.successful.push(taskId);
        results.totalFamcoinsAwarded += result.completion.task_instances.famcoin_value;
      } catch (error) {
        console.error(`Failed to approve task ${taskId}:`, error);
        results.failed.push({
          id: taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Bulk complete tasks on behalf of children
   */
  async bulkCompleteTasksOnBehalf(
    taskIds: string[],
    parentId: string
  ): Promise<{
    successful: string[];
    failed: { id: string; error: string }[];
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Process each task
    for (const taskId of taskIds) {
      try {
        await this.completeTaskOnBehalf(taskId, parentId);
        results.successful.push(taskId);
      } catch (error) {
        console.error(`Failed to complete task ${taskId}:`, error);
        results.failed.push({
          id: taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
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
          task_instances (
            *,
            task_templates (
              *,
              task_categories (*)
            ),
            groups (
              *,
              sequences (*)
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
      
      // Transform to TaskDetailView - handle potential null values
      const ti = data.task_instances || {};
      const tt = ti.task_templates || {};
      const tc = tt.task_categories || {};
      const g = ti.groups || {};
      // const s = g.sequences || {}; // Not used currently
      
      return {
        id: data.id,
        taskInstanceId: data.task_instance_id,
        taskName: ti.custom_name || tt.name || 'Unnamed Task',
        customDescription: ti.custom_description || tt.description,
        groupName: g.name || 'Unnamed Group',
        famcoinValue: ti.famcoin_value || 0,
        photoProofRequired: ti.photo_proof_required || false,
        effortScore: ti.effort_score || 0,
        status: data.status,
        photoUrl: data.photo_url,
        completedAt: data.completed_at,
        rejectionReason: data.rejection_reason,
        feedback: data.feedback,
        categoryIcon: tc.icon || '📋',
        categoryColor: tc.color || '#6b7280',
        templateId: ti.template_id,
        templateName: tt.name || 'Unnamed Template',
        templateDescription: tt.description,
        categoryName: tc.name || 'General',
        groupId: ti.group_id,
        sequenceId: g.sequence_id,
        dueDate: data.due_date,
        isBonusTask: ti.is_bonus_task || false,
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