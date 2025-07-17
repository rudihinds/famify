// Jest setup - no longer need @testing-library/jest-native as matchers are built into react-native testing library v12.4+

// Setup request animation frame
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
};
global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock Expo modules
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "http://localhost:3000/auth/callback"),
}));

jest.mock("expo-camera", () => ({
  Camera: {
    useCameraPermissions: jest.fn(() => [
      { granted: true },
      jest.fn().mockResolvedValue({ granted: true }),
    ]),
  },
  CameraView: "CameraView",
  CameraType: {
    back: "back",
    front: "front",
  },
}));

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: "Images",
  },
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
}));

jest.mock("expo-blur", () => ({
  BlurView: "BlurView",
}));

// Mock Supabase
jest.mock("./lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [], error: null })),
          })),
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({ data: [], error: null })),
            })),
          })),
        })),
        in: jest.fn(() => ({
          order: jest.fn(() => ({ data: [], error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null })),
        match: jest.fn(() => ({ error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null })),
      })),
      upsert: jest.fn(() => ({ error: null })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'task-photos/test.jpg' }, 
          error: null 
        }),
        getPublicUrl: jest.fn(() => ({ 
          data: { publicUrl: 'https://example.com/test.jpg' } 
        })),
      })),
    },
  },
}));

// Mock Alert separately
jest.mock("react-native/Libraries/Alert/Alert", () => ({
  alert: jest.fn((title, message, buttons) => {
    // Automatically call the first button's onPress if it exists
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  }),
}));


// Mock NativeWind
jest.mock("nativewind", () => ({
  styled: (component) => component,
}));

// Mock react-native-css-interop
jest.mock("react-native-css-interop", () => ({
  createCssInteropWrapper: () => (component) => component,
  createInteropElement: jest.requireActual("react").createElement,
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock AsyncStorage for Redux Persist
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock lucide-react-native
jest.mock("lucide-react-native", () => {
  const MockIcon = (props) => props.testID || "Icon";
  return {
    Check: MockIcon,
    X: MockIcon,
    Clock: MockIcon,
    AlertCircle: MockIcon,
    AlertTriangle: MockIcon,
    ChevronDown: MockIcon,
    ChevronUp: MockIcon,
    ChevronLeft: MockIcon,
    ChevronRight: MockIcon,
    CheckSquare: MockIcon,
    CheckCircle: MockIcon,
    Circle: MockIcon,
    Coins: MockIcon,
    Square: MockIcon,
    Award: MockIcon,
    Camera: MockIcon,
    RefreshCw: MockIcon,
    Eye: MockIcon,
    EyeOff: MockIcon,
    ArrowLeft: MockIcon,
    Lock: MockIcon,
    Calendar: MockIcon,
    MessageCircle: MockIcon,
    Code: MockIcon,
    Heart: MockIcon,
    User: MockIcon,
    BookOpen: MockIcon,
    Home: MockIcon,
    Gamepad2: MockIcon,
    Palette: MockIcon,
  };
});

// Mock task service
jest.mock("./services/taskService", () => ({
  taskService: {
    getDailyTasks: jest.fn(),
    getRejectedTasksForChild: jest.fn(),
    getAllRejectedTasks: jest.fn(),
    getTaskById: jest.fn(),
    getTaskDetails: jest.fn(),
    completeTask: jest.fn(),
    uploadTaskPhoto: jest.fn(),
    approveTaskCompletion: jest.fn(),
    rejectTaskCompletion: jest.fn(),
    getParentReviewTasksByDate: jest.fn(),
    getParentPendingApprovalTasks: jest.fn(),
    getParentRejectedTasks: jest.fn(),
    completeTaskOnBehalf: jest.fn(),
    bulkApproveTaskCompletions: jest.fn(),
    bulkCompleteTasksOnBehalf: jest.fn(),
    getTransactionHistory: jest.fn(),
    getTransactionAuditTrail: jest.fn(),
  },
}));

// Mock date-fns if needed
global.Date.now = jest.fn(() => new Date("2024-01-15T10:00:00Z").getTime());
