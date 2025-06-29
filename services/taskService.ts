import { supabase } from '../lib/supabase';
import { TaskCategory, TaskTemplate, CreateTaskTemplateInput } from '../types/task';

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
}

export const taskService = new TaskService();