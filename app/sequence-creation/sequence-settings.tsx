import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setCurrentStep,
  updateSequenceSettings,
  selectSequenceSettings,
  selectIsStepValid
} from '../../store/slices/sequenceCreationSlice';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import PeriodSelector from '../../components/sequence-creation/PeriodSelector';
import BudgetInput from '../../components/sequence-creation/BudgetInput';
import DatePicker from '../../components/common/DatePicker';
import { useRouter } from 'expo-router';
import { errorHandler, withErrorHandling } from '../../services/errorService';

export default function SequenceSettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const sequenceSettings = useSelector(selectSequenceSettings);
  // Use step 1 validation directly for this screen
  const canAdvance = useSelector((state: RootState) => selectIsStepValid(1)(state));
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [conversionRate, setConversionRate] = useState(10); // Default
  const [errors, setErrors] = useState<{
    period?: string;
    startDate?: string;
    budget?: string;
  }>({});

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(1));
  }, [dispatch]);
  
  useEffect(() => {
    fetchParentProfile();
  }, [user?.id]);

  const fetchParentProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
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
  }, [user?.id]);
  
  const validateForm = useCallback(() => {
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
  }, [sequenceSettings]);

  const handleNext = useCallback(() => {
    if (validateForm() && canAdvance) {
      router.push('/sequence-creation/groups-setup');
    }
  }, [canAdvance, router, validateForm]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);
  
  const getPeriodDays = useCallback(() => {
    switch (sequenceSettings.period) {
      case 'weekly': return 7;
      case 'fortnightly': return 14;
      case 'monthly': return 30;
      default: return 0;
    }
  }, [sequenceSettings.period]);
  
  const calculateEndDate = useCallback(() => {
    if (!sequenceSettings.startDate || !sequenceSettings.period) return '';
    
    const start = new Date(sequenceSettings.startDate);
    const days = getPeriodDays();
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    
    return end.toLocaleDateString();
  }, [sequenceSettings.startDate, sequenceSettings.period, getPeriodDays]);

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
            <DatePicker
              value={sequenceSettings.startDate}
              onChange={(date) => {
                dispatch(updateSequenceSettings({ startDate: date }));
                if (errors.startDate) {
                  setErrors({ ...errors, startDate: undefined });
                }
              }}
              label="Start Date"
              error={errors.startDate}
              minDate={minDate}
              maxDate={maxDate}
            />

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