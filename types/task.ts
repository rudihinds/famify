export interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  is_system: boolean;
  created_at: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  photo_proof_required: boolean;
  effort_score?: number;
  is_system: boolean;
  parent_id?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  // Join field from query
  category?: TaskCategory;
}

export interface CreateTaskTemplateInput {
  name: string;
  description?: string;
  category_id: string;
  photo_proof_required?: boolean;
  effort_score?: number;
}