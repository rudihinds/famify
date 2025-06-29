import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setCurrentStep,
  updateSequenceSettings,
  selectSequenceSettings,
  selectIsStepValid
} from '../../store/slices/sequenceCreationSlice';
import { ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import PeriodSelector from '../../components/sequence-creation/PeriodSelector';
import BudgetInput from '../../components/sequence-creation/BudgetInput';

export default function SequenceSettingsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const sequenceSettings = useSelector(selectSequenceSettings);
  // Use step 1 validation directly for this screen
  const canAdvance = useSelector((state: RootState) => selectIsStepValid(1)(state));
  const user = useSelector((state: RootState) => state.auth.user);
  const isEditing = useSelector((state: RootState) => state.sequenceCreation.isEditing);
  const editingSequenceId = useSelector((state: RootState) => state.sequenceCreation.editingSequenceId);
  const selectedChildId = useSelector((state: RootState) => state.sequenceCreation.selectedChildId);
  const currentStep = useSelector((state: RootState) => state.sequenceCreation.currentStep);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [conversionRate, setConversionRate] = useState(10); // Default
  const [errors, setErrors] = useState<{
    period?: string;
    startDate?: string;
    budget?: string;
  }>({});

  useEffect(() => {
    console.log('[SETTINGS] Component mounted');
    console.log('[SETTINGS] Redux state on mount:', {
      sequenceSettings,
      isEditing,
      editingSequenceId,
      selectedChildId,
      currentStep
    });
    
    // Set current step when screen mounts
    console.log('[SETTINGS] Setting current step to 1');
    dispatch(setCurrentStep(1));
    
    // Debug: Check loaded data
    console.log('[SETTINGS] Current settings after mount:', sequenceSettings);
  }, [dispatch]);
  
  useEffect(() => {
    fetchParentProfile();
  }, [user?.id]);

  const fetchParentProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('famcoin_conversion_rate')
        .eq('id', user.id)
        .single();
        
      if (data) {
        setConversionRate(data.famcoin_conversion_rate || 10);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleNext = () => {
    if (validateForm() && canAdvance) {
      router.push('/sequence-creation/groups-setup');
    }
  };

  const handleBack = () => {
    router.back();
  };
  
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!sequenceSettings.period) {
      newErrors.period = 'Please select a period type';
    }
    
    if (!sequenceSettings.startDate) {
      newErrors.startDate = 'Please select a start date';
    }
    
    if (!sequenceSettings.budget || sequenceSettings.budget <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const getPeriodDays = () => {
    switch (sequenceSettings.period) {
      case 'weekly': return 7;
      case 'fortnightly': return 14;
      case 'monthly': return 30;
      default: return 0;
    }
  };
  
  const calculateEndDate = () => {
    if (!sequenceSettings.startDate || !sequenceSettings.period) return '';
    
    const start = new Date(sequenceSettings.startDate);
    const days = getPeriodDays();
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    
    return end.toLocaleDateString();
  };

  const minDate = new Date(); // Today
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3); // 3 months in future

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-100"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              Sequence Settings
            </Text>
            <Text className="mb-6 text-gray-600">
              Configure the sequence period and budget
            </Text>

            {/* Period Selection */}
            <View className="mb-6">
              <Text className="mb-3 font-semibold text-gray-900">Period Type</Text>
              <PeriodSelector
                selectedPeriod={sequenceSettings.period}
                onPeriodChange={(period) => {
                  dispatch(updateSequenceSettings({ period }));
                  if (errors.period) {
                    setErrors({ ...errors, period: undefined });
                  }
                }}
              />
              {errors.period && (
                <Text className="mt-1 ml-1 text-sm text-red-500">{errors.period}</Text>
              )}
            </View>

            {/* Start Date */}
            <View className="mb-6">
              <Text className="mb-3 font-semibold text-gray-900">Start Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row justify-between items-center p-4 bg-white rounded-xl border border-gray-300"
              >
                <Text className={sequenceSettings.startDate ? 'text-gray-900' : 'text-gray-400'}>
                  {sequenceSettings.startDate 
                    ? new Date(sequenceSettings.startDate).toLocaleDateString()
                    : 'Select date'
                  }
                </Text>
                <Calendar size={20} color="#6b7280" />
              </TouchableOpacity>
              {errors.startDate && (
                <Text className="mt-1 ml-1 text-sm text-red-500">{errors.startDate}</Text>
              )}
              
              {/* iOS Date Picker Modal */}
              {showDatePicker && Platform.OS === 'ios' && (
                <Modal
                  transparent
                  animationType="slide"
                  visible={showDatePicker}
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <TouchableOpacity 
                    className="flex-1 justify-end bg-black/30"
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <TouchableOpacity 
                      activeOpacity={1}
                      className="bg-white rounded-t-3xl"
                    >
                      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text className="text-indigo-600 text-base">Cancel</Text>
                        </TouchableOpacity>
                        <Text className="font-semibold text-base">Select Date</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text className="text-indigo-600 text-base font-semibold">Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={sequenceSettings.startDate ? new Date(sequenceSettings.startDate) : new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(_, selectedDate) => {
                          if (selectedDate) {
                            dispatch(updateSequenceSettings({ 
                              startDate: selectedDate.toISOString() 
                            }));
                            if (errors.startDate) {
                              setErrors({ ...errors, startDate: undefined });
                            }
                          }
                        }}
                        minimumDate={minDate}
                        maximumDate={maxDate}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              )}
              
              {/* Android Date Picker */}
              {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={sequenceSettings.startDate ? new Date(sequenceSettings.startDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      dispatch(updateSequenceSettings({ 
                        startDate: selectedDate.toISOString() 
                      }));
                      if (errors.startDate) {
                        setErrors({ ...errors, startDate: undefined });
                      }
                    }
                  }}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                />
              )}
              
              {/* Web date picker */}
              {Platform.OS === 'web' && (
                <input
                  type="date"
                  value={sequenceSettings.startDate ? new Date(sequenceSettings.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    dispatch(updateSequenceSettings({ 
                      startDate: selectedDate.toISOString() 
                    }));
                    if (errors.startDate) {
                      setErrors({ ...errors, startDate: undefined });
                    }
                  }}
                  min={minDate.toISOString().split('T')[0]}
                  max={maxDate.toISOString().split('T')[0]}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900"
                />
              )}
            </View>

            {/* Budget */}
            <View className="mb-6">
              <Text className="mb-3 font-semibold text-gray-900">Budget</Text>
              <BudgetInput
                value={sequenceSettings.budget}
                currencyCode={sequenceSettings.currencyCode}
                conversionRate={conversionRate}
                onChange={(value) => {
                  dispatch(updateSequenceSettings({ budget: value }));
                  if (errors.budget) {
                    setErrors({ ...errors, budget: undefined });
                  }
                }}
                error={errors.budget}
              />
            </View>

            {/* Ongoing Toggle */}
            <View className="mb-6">
              <TouchableOpacity
                onPress={() => {
                  dispatch(updateSequenceSettings({ 
                    ongoing: !sequenceSettings.ongoing 
                  }));
                }}
                className="flex-row justify-between items-center p-4 bg-white rounded-xl border border-gray-300"
              >
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-gray-900">Auto-restart</Text>
                  <Text className="mt-1 text-sm text-gray-600">
                    Automatically create new sequence when this one ends
                  </Text>
                </View>
                <View className={`w-12 h-6 rounded-full ${
                  sequenceSettings.ongoing ? 'bg-indigo-600' : 'bg-gray-300'
                }`}>
                  <View className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                    sequenceSettings.ongoing ? 'left-6' : 'left-0.5'
                  }`} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Summary Card */}
            {sequenceSettings.period && sequenceSettings.startDate && sequenceSettings.budget && (
              <View className="p-4 mb-6 bg-indigo-50 rounded-xl">
                <View className="flex-row items-center mb-2">
                  <Info size={16} color="#4f46e5" />
                  <Text className="ml-2 font-semibold text-indigo-900">Summary</Text>
                </View>
                <View className="space-y-1">
                  <Text className="text-indigo-700">
                    Period: {sequenceSettings.period} ({getPeriodDays()} days)
                  </Text>
                  <Text className="text-indigo-700">
                    Dates: {new Date(sequenceSettings.startDate).toLocaleDateString()} - {calculateEndDate()}
                  </Text>
                  <Text className="text-indigo-700">
                    Budget: {sequenceSettings.currencyCode === 'GBP' ? '£' : '$'}{sequenceSettings.budget?.toFixed(2)}
                  </Text>
                  <Text className="font-semibold text-indigo-700">
                    Total FAMCOINS: {sequenceSettings.budgetFamcoins?.toLocaleString()}
                  </Text>
                  {sequenceSettings.ongoing && (
                    <Text className="mt-1 text-sm text-indigo-700">
                      ↻ Will auto-restart when completed
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Navigation Buttons */}
      <View className="px-4 pt-4 pb-6 bg-white border-t border-gray-200">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleBack}
            className="flex-row flex-1 justify-center items-center px-6 py-4 rounded-xl border border-gray-300"
          >
            <ChevronLeft size={20} color="#6b7280" />
            <Text className="ml-2 font-semibold text-gray-700">
              Back
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canAdvance}
            className={`flex-1 flex-row items-center justify-center py-4 px-6 rounded-xl ${
              canAdvance ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <Text className={`font-semibold mr-2 ${
              canAdvance ? 'text-white' : 'text-gray-500'
            }`}>
              Next
            </Text>
            <ChevronRight size={20} color={canAdvance ? '#ffffff' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}