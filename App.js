
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from './lib/supabase';

// Screens
import AuthScreen from './screens/AuthScreen';
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

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          {session && session.user ? (
            // Authenticated Stack
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'JustABlank' }}
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
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Statistics"
                component={StatisticsScreen}
                options={{ headerShown: false }}
              />
            </>

          ) : (
            // Unauthenticated Stack
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer >
    </QueryClientProvider>
  );
}
