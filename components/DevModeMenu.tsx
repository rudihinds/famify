import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { X, Trash2, Users } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { RootState, AppDispatch, persistor } from '../store';
import { signOut } from '../store/slices/authSlice';
import { devModeLogin } from '../store/slices/childSlice';
import { Alert } from '../lib/alert';
import { childService } from '../services/childService';

interface DevModeMenuProps {
  onDataChanged?: () => void;
}

export default function DevModeMenu({ onDataChanged }: DevModeMenuProps = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCreatingData, setIsCreatingData] = useState(false);
  const [connectedChildren, setConnectedChildren] = useState<any[]>([]);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);
  
  const testChildren = [
    {
      name: 'Emma',
      age: 8,
      pin: '1234',
      focus_areas: ['homework', 'chores'],
      avatar_url: null,
    },
    {
      name: 'Liam',
      age: 10,
      pin: '5678',
      focus_areas: ['sports', 'reading'],
      avatar_url: null,
    }
  ];
  
  // Fetch connected children when modal opens
  useEffect(() => {
    if (isVisible && auth.user?.id) {
      fetchConnectedChildren();
    }
  }, [isVisible, auth.user?.id]);
  
  const fetchConnectedChildren = async () => {
    if (!auth.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', auth.user.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching children:', error);
      } else {
        setConnectedChildren(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  const handleGoToLogin = () => {
    setIsVisible(false);
    router.push('/auth/parent-login');
  };
  
  const handleGoToChildMode = () => {
    setIsVisible(false);
    router.push('/child/scanner');
  };
  
  const handleLoginAsChild = async (child: any) => {
    try {
      // Use dev mode login to bypass PIN authentication
      dispatch(devModeLogin({
        id: child.id,
        name: child.name,
        age: child.age,
        avatar_url: child.avatar_url,
        focus_areas: child.focus_areas || [],
        parent_id: child.parent_id,
        famcoin_balance: child.famcoin_balance || 0,
        created_at: child.created_at,
        updated_at: child.updated_at,
      }));
      
      // Navigate to child dashboard
      setIsVisible(false);
      router.replace('/child');
      
      Alert.alert('Dev Mode', `Logged in as ${child.name} (bypassing PIN)`);
    } catch (error) {
      console.error('Error logging in as child:', error);
      Alert.alert('Error', 'Failed to login as child');
    }
  };
  
  const handleCreateTestData = async () => {
    if (!auth.user?.id) {
      Alert.alert('Error', 'Please login as parent first');
      return;
    }
    
    setIsCreatingData(true);
    try {
      // Create test children
      for (const childData of testChildren) {
        const { data, error } = await supabase
          .from('children')
          .insert({
            parent_id: auth.user.id,
            name: childData.name,
            age: childData.age,
            pin_hash: childData.pin, // In real app, this should be hashed
            focus_areas: childData.focus_areas,
            avatar_url: childData.avatar_url,
            famcoin_balance: 0,
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error creating child:', error);
        } else {
          console.log('Created child:', data);
        }
      }
      
      Alert.alert('Success', 'Test children created successfully');
      // Notify parent component to refresh
      onDataChanged?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to create test data');
      console.error(error);
    } finally {
      setIsCreatingData(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsVisible(false);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };
  
  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all persisted state, log you out, and reset the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from auth
              await dispatch(signOut());
              // Clear persisted state
              await persistor.purge();
              // Clear localStorage on web
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.clear();
              }
              Alert.alert('Success', 'All data cleared. Please refresh the app.');
              setIsVisible(false);
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };
  
  const handleRemoveAllChildren = async () => {
    if (!auth.user?.id) {
      Alert.alert('Error', 'Please login as parent first');
      return;
    }
    
    Alert.alert(
      'Remove All Children',
      'This will permanently delete all children profiles and their data. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletedCount = await childService.deleteAllChildrenForParent(auth.user.id);
              Alert.alert(
                'Success', 
                `Removed ${deletedCount} child profile${deletedCount !== 1 ? 's' : ''}`
              );
              // Notify parent component to refresh
              onDataChanged?.();
            } catch (error) {
              console.error('Error removing children:', error);
              Alert.alert('Error', 'Failed to remove children');
            }
          },
        },
      ]
    );
  };
  
  return (
    <>
      {/* Dev Mode Button */}
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        className="bg-yellow-500 p-2 rounded-full"
        style={{ 
          position: 'absolute', 
          top: 48, 
          right: 16, 
          zIndex: 999,
          elevation: 999 // For Android
        }}
      >
        <Text className="text-black font-bold">🔧</Text>
      </TouchableOpacity>
      
      {/* Dev Mode Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-8">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold">Dev Mode Menu</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {/* Current Status */}
            <View className="bg-gray-100 p-4 rounded-lg mb-4">
              <Text className="font-semibold mb-1">Current Status:</Text>
              <Text>Device Type: {auth.deviceType}</Text>
              <Text>User ID: {auth.user?.id || 'Not logged in'}</Text>
              <Text>Email: {auth.user?.email || 'N/A'}</Text>
            </View>
            
            {/* Quick Actions */}
            <View style={{ gap: 12 }}>
              {!auth.user && (
                <TouchableOpacity
                  onPress={handleGoToLogin}
                  className="bg-blue-500 p-4 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold">
                    Go to Login
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={handleGoToChildMode}
                className="bg-green-500 p-4 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">
                  Switch to Child Mode
                </Text>
              </TouchableOpacity>
              
              {auth.user && (
                <>
                  {/* Show connected children as individual buttons */}
                  {connectedChildren.length > 0 && (
                    <View>
                      <Text className="text-sm text-gray-600 mb-2">Login as Child:</Text>
                      {connectedChildren.map((child) => (
                        <TouchableOpacity
                          key={child.id}
                          onPress={() => handleLoginAsChild(child)}
                          className="bg-cyan-500 p-3 rounded-lg flex-row items-center justify-between mb-2"
                        >
                          <View className="flex-1">
                            <Text className="text-white font-semibold">{child.name}</Text>
                            <Text className="text-cyan-100 text-xs">
                              Age {child.age} • {child.famcoin_balance || 0} FC
                            </Text>
                          </View>
                          <Users size={18} color="white" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  <TouchableOpacity
                    onPress={handleCreateTestData}
                    disabled={isCreatingData}
                    className={`p-4 rounded-lg ${isCreatingData ? 'bg-gray-400' : 'bg-purple-500'}`}
                  >
                    <Text className="text-white text-center font-semibold">
                      {isCreatingData ? 'Creating...' : 'Create Test Children'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleRemoveAllChildren}
                    className="bg-orange-500 p-4 rounded-lg"
                  >
                    <Text className="text-white text-center font-semibold">
                      Remove All Children
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {auth.user && (
                <TouchableOpacity
                  onPress={handleLogout}
                  className="bg-red-500 p-4 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold">
                    Logout
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={handleClearAllData}
                className="bg-gray-800 p-4 rounded-lg flex-row items-center justify-center"
              >
                <Trash2 size={20} color="white" />
                <Text className="text-white text-center font-semibold ml-2">
                  Clear All Data & Reset
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Test Data Info */}
            <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <Text className="text-xs text-gray-600">
                Test User: {process.env.EXPO_PUBLIC_TEST_EMAIL || 'Not configured'}
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                Test Children: Emma (PIN: 1234), Liam (PIN: 5678)
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}