import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { combineReducers } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import authSlice from "./slices/authSlice";
import childSlice from "./slices/childSlice";
import connectionSlice from "./slices/connectionSlice";
import sequenceCreationSlice from "./slices/sequenceCreationSlice";
import sequencesSlice from "./slices/sequencesSlice";
import { sequenceApi } from "./api/sequenceApi";

// Storage implementation with proper error handling
let storage: any;

if (Platform.OS === "web") {
  // Web storage with improved error handling
  storage = {
    getItem: async (key: string): Promise<string | null> => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const item = window.localStorage.getItem(key);
          return Promise.resolve(item);
        }
        return Promise.resolve(null);
      } catch (error) {
        console.warn("localStorage getItem failed:", error);
        return Promise.resolve(null);
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return Promise.resolve();
        }
        return Promise.resolve();
      } catch (error) {
        console.warn("localStorage setItem failed:", error);
        return Promise.resolve();
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          return Promise.resolve();
        }
        return Promise.resolve();
      } catch (error) {
        console.warn("localStorage removeItem failed:", error);
        return Promise.resolve();
      }
    },
  };
} else {
  // React Native storage
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    storage = AsyncStorage;
  } catch (error) {
    console.warn("AsyncStorage not available, using fallback:", error);
    // Fallback storage for testing or when AsyncStorage is not available
    storage = {
      getItem: async () => Promise.resolve(null),
      setItem: async () => Promise.resolve(),
      removeItem: async () => Promise.resolve(),
    };
  }
}

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"],
  debug: false,
};

// Separate persist config for sequence creation
const sequenceCreationPersistConfig = {
  key: "sequenceCreation",
  storage,
  whitelist: ["selectedChildId", "sequenceSettings", "groups", "selectedTasksByGroup", "currentStep"],
  // Don't persist loading/error states
  blacklist: ["isLoading", "error", "validationErrors"],
};

const rootReducer = combineReducers({
  auth: authSlice,
  child: childSlice,
  connection: connectionSlice,
  sequenceCreation: persistReducer(sequenceCreationPersistConfig, sequenceCreationSlice),
  sequences: sequencesSlice,
  [sequenceApi.reducerPath]: sequenceApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/REGISTER",
          "persist/PURGE",
          "persist/FLUSH",
          "persist/PAUSE",
          "FLUSH",
          "REHYDRATE",
          "PAUSE",
          "PERSIST",
          "PURGE",
          "REGISTER",
        ],
      },
    }).concat(sequenceApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
