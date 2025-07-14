import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { Platform } from "react-native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../store";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === "web") {
      const { TempoDevtools } = require("tempo-devtools");
      TempoDevtools.init();
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider value={DefaultTheme}>
          <Stack
            screenOptions={({ route }) => ({
              headerShown: !route.name.startsWith("tempobook"),
            })}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth/welcome"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="auth/parent-login"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="auth/parent-register"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="parent/dashboard"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(parent)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="child/scanner"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="child/profile-setup"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="child/pin-creation"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="child/pin-login"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(child)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="auth/callback"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="auth/confirm"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="sequence-creation"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
