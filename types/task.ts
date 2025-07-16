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

// Phase 1 types
export interface TaskCompletionView {
  id: string; // task_completion.id
  taskInstanceId: string;
  taskName: string;
  customDescription?: string;
  groupName: string;
  famcoinValue: number;
  photoProofRequired: boolean;
  effortScore: number;
  status: 'pending' | 'child_completed' | 'parent_approved' | 'parent_rejected' | 'excused';
  photoUrl?: string;
  completedAt?: string;
  rejectionReason?: string;
  categoryIcon: string;
  categoryColor: string;
  dueDate: string;
}

export interface TaskDetailView extends TaskCompletionView {
  templateId: string;
  templateName: string;
  templateDescription?: string;
  categoryName: string;
  groupId: string;
  sequenceId: string;
  dueDate: string;
  isBonusTask: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineTaskAction {
  id: string;
  type: 'complete' | 'photo_upload';
  taskCompletionId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}