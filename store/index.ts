import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { combineReducers } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import childSlice from "./slices/childSlice";
import connectionSlice from "./slices/connectionSlice";

// Conditionally import AsyncStorage based on platform
let AsyncStorage: any;

// Check if we're in a React Native environment
const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

if (isReactNative) {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} else {
  // For web, use a localStorage-based storage with proper window checks
  AsyncStorage = {
    getItem: (key: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        return Promise.resolve(localStorage.getItem(key));
      }
      return Promise.resolve(null);
    },
    setItem: (key: string, value: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(key);
      }
      return Promise.resolve();
    },
  };
}

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth", "child", "connection"],
};

const rootReducer = combineReducers({
  auth: authSlice,
  child: childSlice,
  connection: connectionSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
