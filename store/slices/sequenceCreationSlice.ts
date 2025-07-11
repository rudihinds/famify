import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { sequenceApi } from "../api/sequenceApi";

// Interfaces
interface SequenceSettings {
  period: 'weekly' | 'fortnightly' | 'monthly' | null;
  startDate: string | null;  // ISO date string
  budget: number | null;
  currencyCode: string;  // Default from parent profile
  budgetFamcoins: number | null;  // Calculated from budget
  ongoing: boolean;
}

interface Group {
  id: string;  // Temporary ID for wizard
  name: string;
  activeDays: number[];  // 1-7 (Mon-Sun)
}

interface SequenceCreationState {
  // Wizard Navigation
  currentStep: number;  // 0-4 representing the 5 steps
  
  // Step 1: Child Selection
  selectedChildId: string | null;
  
  // Step 2: Sequence Settings
  sequenceSettings: SequenceSettings;
  
  // Step 3: Groups
  groups: Group[];
  
  // Step 4: Tasks
  selectedTasksByGroup: Record<string, string[]>;  // groupId -> taskTemplateIds[]
  
  // Loading & Error States
  isLoading: boolean;
  error: string | null;
  
  // Validation States
  validationErrors: Record<string, string>;  // step-specific errors
  
  // Editing Mode
  isEditing: boolean;
  editingSequenceId: string | null;
}

// Initial state
const initialState: SequenceCreationState = {
  currentStep: 0,
  selectedChildId: null,
  sequenceSettings: {
    period: null,
    startDate: null,
    budget: null,
    currencyCode: 'GBP',  // Default currency
    budgetFamcoins: null,
    ongoing: false,
  },
  groups: [],
  selectedTasksByGroup: {},
  isLoading: false,
  error: null,
  validationErrors: {},
  isEditing: false,
  editingSequenceId: null,
};

// Helper Functions
const generateGroupId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const calculateFamcoins = (amount: number, conversionRate: number = 10) => 
  Math.floor(amount * conversionRate);

const isGroupNameUnique = (name: string, groups: Group[], excludeId?: string) => {
  return !groups.some(g => g.id !== excludeId && g.name.toLowerCase().trim() === name.toLowerCase().trim());
};

// Slice
const sequenceCreationSlice = createSlice({
  name: 'sequenceCreation',
  initialState,
  reducers: {
    // Navigation
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    
    // Child Selection
    setSelectedChild: (state, action: PayloadAction<string>) => {
      state.selectedChildId = action.payload;
    },
    
    // Sequence Settings
    updateSequenceSettings: (state, action: PayloadAction<Partial<SequenceSettings>>) => {
      state.sequenceSettings = { ...state.sequenceSettings, ...action.payload };
      
      // Auto-calculate FAMCOINS when budget changes
      if (action.payload.budget !== undefined) {
        const conversionRate = 10; // TODO: Get from parent profile
        state.sequenceSettings.budgetFamcoins = calculateFamcoins(action.payload.budget, conversionRate);
      }
    },
    
    // Groups Management
    addGroup: (state, action: PayloadAction<Omit<Group, 'id'>>) => {
      const newGroup: Group = {
        id: generateGroupId(),
        ...action.payload,
      };
      
      // Validate unique name
      if (!isGroupNameUnique(newGroup.name, state.groups)) {
        state.validationErrors.groups = 'Group name must be unique';
        return;
      }
      
      state.groups.push(newGroup);
      state.selectedTasksByGroup[newGroup.id] = [];
      delete state.validationErrors.groups;
    },
    
    updateGroup: (state, action: PayloadAction<{id: string; updates: Partial<Group>}>) => {
      const { id, updates } = action.payload;
      const groupIndex = state.groups.findIndex(g => g.id === id);
      
      if (groupIndex !== -1) {
        // Validate unique name if updating name
        if (updates.name && !isGroupNameUnique(updates.name, state.groups, id)) {
          state.validationErrors.groups = 'Group name must be unique';
          return;
        }
        
        state.groups[groupIndex] = { ...state.groups[groupIndex], ...updates };
        delete state.validationErrors.groups;
      }
    },
    
    deleteGroup: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      state.groups = state.groups.filter(g => g.id !== groupId);
      delete state.selectedTasksByGroup[groupId];
    },
    
    // Tasks Management
    addTaskToGroup: (state, action: PayloadAction<{groupId: string; taskId: string}>) => {
      const { groupId, taskId } = action.payload;
      if (!state.selectedTasksByGroup[groupId]) {
        state.selectedTasksByGroup[groupId] = [];
      }
      if (!state.selectedTasksByGroup[groupId].includes(taskId)) {
        state.selectedTasksByGroup[groupId].push(taskId);
      }
    },
    
    removeTaskFromGroup: (state, action: PayloadAction<{groupId: string; taskId: string}>) => {
      const { groupId, taskId } = action.payload;
      if (state.selectedTasksByGroup[groupId]) {
        state.selectedTasksByGroup[groupId] = state.selectedTasksByGroup[groupId]
          .filter(id => id !== taskId);
      }
    },
    
    setTasksForGroup: (state, action: PayloadAction<{groupId: string; taskIds: string[]}>) => {
      const { groupId, taskIds } = action.payload;
      state.selectedTasksByGroup[groupId] = taskIds;
    },
    
    // State Management
    resetWizard: (state) => {
      console.log('[SEQUENCE] resetWizard called - resetting entire state');
      Object.assign(state, initialState);
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setValidationError: (state, action: PayloadAction<{step: string; error: string}>) => {
      const { step, error } = action.payload;
      state.validationErrors[step] = error;
    },
    
    clearValidationErrors: (state) => {
      state.validationErrors = {};
    },
    
    // Editing Mode
    setEditingMode: (state, action: PayloadAction<{sequenceId: string; isEditing: boolean}>) => {
      console.log('[SEQUENCE] setEditingMode called with:', action.payload);
      state.isEditing = action.payload.isEditing;
      state.editingSequenceId = action.payload.sequenceId;
    },
    
    loadSequenceForEditing: (state, action: PayloadAction<{
      sequenceId: string;
      selectedChildId: string;
      sequenceSettings: Partial<SequenceSettings>;
      groups: Group[];
      selectedTasksByGroup: Record<string, string[]>;
    }>) => {
      const { sequenceId, selectedChildId, sequenceSettings, groups, selectedTasksByGroup } = action.payload;
      
      // Set editing mode
      console.log('[SEQUENCE] loadSequenceForEditing - setting isEditing=true for sequence:', sequenceId);
      state.isEditing = true;
      state.editingSequenceId = sequenceId;
      
      // Populate all fields with existing data
      state.selectedChildId = selectedChildId;
      state.sequenceSettings = { ...state.sequenceSettings, ...sequenceSettings };
      state.groups = groups;
      state.selectedTasksByGroup = selectedTasksByGroup;
      
      // Clear any previous errors
      state.error = null;
      state.validationErrors = {};
    },
  },
  extraReducers: (builder) => {
    // Handle async thunk cases
    builder
      .addCase(createSequence.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSequence.fulfilled, (state) => {
        state.isLoading = false;
        // Only reset wizard for new sequences, not updates
        if (!state.isEditing) {
          // Reset wizard on successful creation
          Object.assign(state, initialState);
        } else {
          // For updates, just clear the editing flag
          state.isEditing = false;
          state.editingSequenceId = null;
        }
      })
      .addCase(createSequence.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to create sequence';
      });
  },
});

// Async Thunks
export const fetchSequenceForEditing = createAsyncThunk(
  'sequenceCreation/fetchForEditing',
  async (sequenceId: string, { dispatch }) => {
    const { sequenceService } = await import('../../services/sequenceService');
    const data = await sequenceService.getSequenceForEditing(sequenceId);
    
    // Load the data into state
    dispatch(loadSequenceForEditing({
      sequenceId,
      ...data
    }));
    
    return data;
  }
);

export const createSequence = createAsyncThunk(
  'sequenceCreation/create',
  async (_, { getState, rejectWithValue, dispatch }) => {
    const state = getState() as RootState;
    const { selectedChildId, sequenceSettings, groups, selectedTasksByGroup, isEditing, editingSequenceId } = state.sequenceCreation;
    const parentId = state.auth.user?.id;
    
    // Debug logging
    console.log('[SEQUENCE] createSequence called with isEditing:', isEditing, 'editingSequenceId:', editingSequenceId);
    
    try {
      // Validate all required data
      if (!selectedChildId || !sequenceSettings.period || !sequenceSettings.startDate || !sequenceSettings.budget) {
        throw new Error('Missing required sequence data');
      }
      
      if (!parentId) {
        throw new Error('Parent ID not found');
      }
      
      // Validate groups and tasks
      if (groups.length === 0) {
        throw new Error('At least one group is required');
      }
      
      const hasTasksInAllGroups = groups.every(group => 
        selectedTasksByGroup[group.id] && selectedTasksByGroup[group.id].length > 0
      );
      
      if (!hasTasksInAllGroups) {
        throw new Error('Each group must have at least one task');
      }
      
      // Import sequence service
      const { sequenceService } = await import('../../services/sequenceService');
      
      // Only check for active sequence if not editing
      console.log('[SEQUENCE] Checking active sequence - isEditing:', isEditing);
      if (!isEditing) {
        const hasActiveSequence = await sequenceService.checkActiveSequence(selectedChildId);
        console.log('[SEQUENCE] Has active sequence:', hasActiveSequence);
        if (hasActiveSequence) {
          throw new Error('This child already has an active sequence. Please complete or archive it first.');
        }
      } else {
        console.log('[SEQUENCE] Skipping active sequence check because isEditing=true');
      }
      
      // Create or update the sequence
      let result;
      
      // Map Redux period format to service format
      const periodMap: Record<string, string> = {
        'weekly': '1week',
        'fortnightly': '2weeks',
        'monthly': '1month',
      };
      const servicePeriod = periodMap[sequenceSettings.period || ''] || '1week';
      
      if (isEditing && editingSequenceId) {
        // Update existing sequence
        result = await sequenceService.updateSequence(editingSequenceId, {
          childId: selectedChildId,
          parentId,
          period: servicePeriod as '1week' | '2weeks' | '1month' | 'ongoing',
          startDate: sequenceSettings.startDate,
          budget: sequenceSettings.budget,
          budgetFamcoins: sequenceSettings.budgetFamcoins || 0,
          currencyCode: sequenceSettings.currencyCode,
          groups,
          selectedTasksByGroup,
        });
      } else {
        // Create new sequence
        result = await sequenceService.createSequence({
          childId: selectedChildId,
          parentId,
          period: servicePeriod as '1week' | '2weeks' | '1month' | 'ongoing',
          startDate: sequenceSettings.startDate,
          budget: sequenceSettings.budget,
          budgetFamcoins: sequenceSettings.budgetFamcoins || 0,
          currencyCode: sequenceSettings.currencyCode,
          groups,
          selectedTasksByGroup,
        });
      }
      
      // Invalidate RTK Query cache to ensure fresh data
      dispatch(sequenceApi.util.invalidateTags(['ActiveSequence']));
      
      return { success: true, sequenceId: result.sequenceId };
    } catch (error: any) {
      console.error('Failed to create sequence:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Export actions
export const {
  setCurrentStep,
  setSelectedChild,
  updateSequenceSettings,
  addGroup,
  updateGroup,
  deleteGroup,
  addTaskToGroup,
  removeTaskFromGroup,
  setTasksForGroup,
  resetWizard,
  setLoading,
  setError,
  setValidationError,
  clearValidationErrors,
  setEditingMode,
  loadSequenceForEditing,
} = sequenceCreationSlice.actions;

// Export thunks
export { fetchSequenceForEditing, createSequence };

// Basic selectors
export const selectSelectedChild = (state: RootState) => state.sequenceCreation.selectedChildId;
export const selectSequenceSettings = (state: RootState) => state.sequenceCreation.sequenceSettings;
export const selectGroups = (state: RootState) => state.sequenceCreation.groups;
export const selectCurrentStep = (state: RootState) => state.sequenceCreation.currentStep;
export const selectIsLoading = (state: RootState) => state.sequenceCreation.isLoading;
export const selectError = (state: RootState) => state.sequenceCreation.error;
export const selectValidationErrors = (state: RootState) => state.sequenceCreation.validationErrors;
export const selectIsEditing = (state: RootState) => state.sequenceCreation.isEditing;
export const selectEditingSequenceId = (state: RootState) => state.sequenceCreation.editingSequenceId;

// Computed selectors
export const selectTasksForGroup = (groupId: string) => (state: RootState) => 
  state.sequenceCreation.selectedTasksByGroup[groupId] || [];

export const selectTotalTaskCount = (state: RootState) => {
  const { groups, selectedTasksByGroup, sequenceSettings } = state.sequenceCreation;
  
  // Calculate number of weeks based on period
  let weeks = 1;
  if (sequenceSettings.period === 'fortnightly') weeks = 2;
  else if (sequenceSettings.period === 'monthly') weeks = 4.34; // Average weeks in a month
  
  // Calculate total task completions
  let totalCompletions = 0;
  groups.forEach(group => {
    const tasksInGroup = selectedTasksByGroup[group.id]?.length || 0;
    const daysPerWeek = group.activeDays.length;
    totalCompletions += tasksInGroup * daysPerWeek * weeks;
  });
  
  return Math.round(totalCompletions);
};

// Validation selectors
export const selectIsStepValid = (step: number) => (state: RootState) => {
  const { selectedChildId, sequenceSettings, groups, selectedTasksByGroup } = state.sequenceCreation;
  
  switch (step) {
    case 0: // Child selection
      return !!selectedChildId;
      
    case 1: // Sequence settings
      return !!(
        sequenceSettings.period && 
        sequenceSettings.startDate && 
        sequenceSettings.budget && 
        sequenceSettings.budget > 0
      );
      
    case 2: // Groups
      return groups.length > 0 && groups.every(g => 
        g.name.trim() && g.activeDays.length > 0
      );
      
    case 3: // Tasks
      return groups.every(g => 
        selectedTasksByGroup[g.id]?.length > 0
      );
      
    case 4: // Review
      return true; // All previous steps must be valid to reach here
      
    default:
      return false;
  }
};

export const selectCanAdvanceStep = (state: RootState) => {
  const currentStep = state.sequenceCreation.currentStep;
  return selectIsStepValid(currentStep)(state);
};

// FAMCOIN calculation selectors
export const selectFamcoinPerTask = (state: RootState) => {
  const totalTasks = selectTotalTaskCount(state);
  const budgetFamcoins = state.sequenceCreation.sequenceSettings.budgetFamcoins;
  
  if (!budgetFamcoins || totalTasks === 0) return 0;
  return Math.floor(budgetFamcoins / totalTasks);
};

export const selectFamcoinRemainder = (state: RootState) => {
  const totalTasks = selectTotalTaskCount(state);
  const budgetFamcoins = state.sequenceCreation.sequenceSettings.budgetFamcoins;
  
  if (!budgetFamcoins || totalTasks === 0) return 0;
  return budgetFamcoins % totalTasks;
};

// Wizard progress selector
export const selectWizardProgress = (state: RootState) => {
  const currentStep = state.sequenceCreation.currentStep;
  const totalSteps = 5;
  return {
    currentStep,
    totalSteps,
    percentage: (currentStep / (totalSteps - 1)) * 100,
  };
};

export default sequenceCreationSlice.reducer;