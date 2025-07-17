// Development utilities and test data
export const isDevMode = () => {
  return process.env.EXPO_PUBLIC_DEV_MODE === 'true';
};

export const getTestChildren = () => [
  {
    id: 'child-1',
    name: 'Emma',
    age: 8,
    pin: '1234',
    avatarUrl: 'avatar-1',
    focusAreas: ['reading', 'chores'],
  },
  {
    id: 'child-2', 
    name: 'Liam',
    age: 10,
    pin: '5678',
    avatarUrl: 'avatar-2',
    focusAreas: ['math', 'exercise'],
  },
];

export const DEV_CONFIG = {
  parentId: 'dev-parent-123',
  testChildren: getTestChildren(),
  testParent: {
    email: 'test@famify.com',
    password: 'testpass123',
  },
};

// Helper to generate mock connection token
export const generateMockConnectionToken = (childName: string = 'Emma') => {
  return {
    token: `mock-token-${Date.now()}`,
    childName,
    parentId: DEV_CONFIG.parentId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
  };
};

// Helper to bypass auth in dev mode
export const devModeBypass = {
  skipQRScan: true,
  skipPINValidation: true,
  autoLogin: true,
  persistentSession: true,
};

// Dev mode test tasks
export const getTestTasks = () => [
  {
    id: 'task-1',
    taskName: 'Make Bed',
    categoryName: 'Morning Routine',
    famcoinValue: 3,
    effortScore: 1,
    photoProofRequired: false,
    status: 'pending',
  },
  {
    id: 'task-2',
    taskName: 'Brush Teeth',
    categoryName: 'Morning Routine',
    famcoinValue: 2,
    effortScore: 1,
    photoProofRequired: true,
    status: 'pending',
  },
  {
    id: 'task-3',
    taskName: 'Clean Room',
    categoryName: 'Chores',
    famcoinValue: 10,
    effortScore: 3,
    photoProofRequired: true,
    status: 'parent_rejected',
    rejectionReason: 'Room still messy in photo',
  },
];

// Dev mode logging helper
export const devLog = (message: string, data?: any) => {
  if (isDevMode()) {
    console.log(`[DEV] ${message}`, data || '');
  }
};