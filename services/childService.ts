import { supabase } from '../lib/supabase';

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  age: number;
  pin_hash: string;
  famcoin_balance: number;
  avatar_url?: string;
  focus_areas?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing child profiles
 */
export const childService = {
  /**
   * Fetch all children for a parent
   */
  async getChildrenByParentId(parentId: string): Promise<Child[]> {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new child profile
   */
  async createChild(child: Partial<Child>): Promise<Child> {
    const { data, error } = await supabase
      .from('children')
      .insert(child)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a specific child profile
   */
  async deleteChild(childId: string): Promise<void> {
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId);

    if (error) throw error;
  },

  /**
   * Delete all children for a parent
   * This will cascade delete related data (sessions, tasks, etc.)
   */
  async deleteAllChildrenForParent(parentId: string): Promise<number> {
    // First get count of children to be deleted
    const { count } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId);

    // Delete all children
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('parent_id', parentId);

    if (error) throw error;
    
    return count || 0;
  },

  /**
   * Update a child profile
   */
  async updateChild(childId: string, updates: Partial<Child>): Promise<Child> {
    const { data, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', childId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check if a parent has any children
   */
  async hasChildren(parentId: string): Promise<boolean> {
    const { count } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId);

    return (count || 0) > 0;
  }
};