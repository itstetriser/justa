
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ActivityIndicator, View } from 'react-native';
import { supabase } from './lib/supabase';
import { Feather } from '@expo/vector-icons';
import { COLORS } from './lib/theme';
import { useQuery } from '@tanstack/react-query'; // [NEW] - Ensure useQuery is imported
import { fetchUserProfile } from './lib/api'; // [NEW]
import { getTranslation } from './lib/translations'; // [NEW]
import { useFonts } from 'expo-font'; // [NEW]

// Screens
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import AdminScreen from './screens/AdminScreen';
import ManageQuestionsScreen from './screens/ManageQuestionsScreen';
import ManageWotdScreen from './screens/ManageWotdScreen';
import BulkAddWotdScreen from './screens/BulkAddWotdScreen';
import AddQuestionScreen from './screens/AddQuestionScreen';
import BulkAddScreen from './screens/BulkAddScreen';
import SettingsScreen from './screens/SettingsScreen';
import StatisticsScreen from './screens/StatisticsScreen';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();


// Deep Linking Config
const linking = {
  prefixes: ['justablank://'],
  config: {
    screens: {
      Home: 'home',
      Stats: 'stats',
      Profile: 'profile',
    },
  },
};



export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'Satoshi-Regular': require('./assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Bold': require('./assets/fonts/Satoshi-Bold.otf'),
    'Satoshi-Medium': require('./assets/fonts/Satoshi-Medium.otf'),
    'Satoshi-Black': require('./assets/fonts/Satoshi-Black.otf'),
  });

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" />}>
        <Stack.Navigator>
          {session && session.user ? (
            // Authenticated Stack
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Stats"
                component={StatisticsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Profile"
                component={SettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Game"
                component={GameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Admin"
                component={AdminScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ManageQuestions"
                component={ManageQuestionsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ManageWotd"
                component={ManageWotdScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BulkAddWotd"
                component={BulkAddWotdScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddQuestion"
                component={AddQuestionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BulkAdd"
                component={BulkAddScreen}
                options={{ headerShown: false }}
              />

            </>

          ) : (
            // Unauthenticated Stack
            <>
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer >
    </QueryClientProvider>
  );
}
