import { Task, TaskCompletion } from '../../types/task';

// Task mock factory
export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-123',
  taskName: 'Read for 20 minutes',
  taskDescription: 'Read any book for 20 minutes',
  groupName: 'Evening Routine',
  categoryName: 'Education',
  categoryIcon: '📚',
  categoryColor: '#4f46e5',
  famcoinValue: 5,
  effortScore: 3,
  dueDate: new Date().toISOString(),
  photoProofRequired: false,
  status: 'pending',
  ...overrides,
});

// Task completion mock factory
export const createMockTaskCompletion = (overrides: Partial<TaskCompletion> = {}): TaskCompletion => ({
  id: 'completion-123',
  taskInstanceId: 'task-123',
  childId: 'child-123',
  dueDate: new Date().toISOString(),
  status: 'pending',
  completedAt: null,
  approvedAt: null,
  approvedBy: null,
  famcoinsEarned: 0,
  photoUrl: null,
  feedback: null,
  rejectedAt: null,
  rejectedBy: null,
  rejectionReason: null,
  ...overrides,
});

// Child mock factory
export const createMockChild = (overrides: any = {}) => ({
  id: 'child-123',
  parent_id: 'parent-123',
  name: 'Emma',
  age: 8,
  pin_hash: '1234',
  device_id: 'device-123',
  famcoin_balance: 100,
  avatar_url: null,
  focus_areas: ['reading', 'chores'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Parent mock factory
export const createMockParent = (overrides: any = {}) => ({
  id: 'parent-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  famcoinConversionRate: 100,
  ...overrides,
});

// Child session mock factory
export const createMockChildSession = (overrides: any = {}) => ({
  childId: 'child-123',
  sessionId: 'session-123',
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
  lastActivity: new Date().toISOString(),
  ...overrides,
});

// Redux state mock factories
export const createMockAuthState = (overrides: any = {}) => ({
  user: null,
  session: null,
  deviceType: 'unlinked' as const,
  isLoading: false,
  error: null,
  ...overrides,
});

export const createMockChildState = (overrides: any = {}) => ({
  profile: overrides.profile || null,
  isAuthenticated: false,
  pinAttempts: 0,
  isLocked: false,
  lockUntil: null,
  sessionExpiry: null,
  lastActivity: Date.now(),
  isLoading: false,
  error: null,
  currentBalance: 0,
  pendingEarnings: 0,
  balanceLastUpdated: null,
  ...overrides,
});

export const createMockTaskState = (overrides: any = {}) => ({
  dailyTasks: [],
  todayTasks: [],
  rejectedTasks: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  isRefreshing: false,
  error: null,
  photoUploadProgress: {},
  offlineQueue: [],
  ...overrides,
});

export const createMockParentState = (overrides: any = {}) => ({
  pendingApprovalCount: 0,
  ...overrides,
});

// Supabase mock response factory
export const createSupabaseResponse = <T>(data: T | null, error: any = null) => ({
  data,
  error,
});

// Mock photo/camera data
export const createMockPhoto = () => ({
  uri: 'file:///path/to/photo.jpg',
  width: 1024,
  height: 768,
  type: 'image/jpeg',
  fileName: 'photo.jpg',
});

// Mock storage URL
export const createMockStorageUrl = (path: string) => 
  `https://emvmlvpigsctiztbzciu.supabase.co/storage/v1/object/public/${path}`;

// Date helpers for tests
export const getToday = () => new Date().toISOString().split('T')[0];
export const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};
export const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

export const createMockConnectionToken = (overrides?: Partial<any>): any => ({
  id: 'token-123',
  parentId: 'parent-123',
  token: 'abc123def456',
  childName: 'Emma',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
  used: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockConnectionState = (overrides?: Partial<any>): any => ({
  currentToken: null,
  qrValue: null,
  isGenerating: false,
  error: null,
  ...overrides,
});