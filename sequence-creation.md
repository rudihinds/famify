# Sequence Creation Flow - Complete Implementation Guide

## Flow Overview

The sequence creation feature is a **modal wizard flow** that guides parents through creating structured task schedules for their children. This is a core feature that transforms task management from ad-hoc to systematic, organized sequences.

### Business Context

**Sequences** are time-bound collections of tasks organized into contextual groups (e.g., "Morning Routine", "After School"). Each child can have one active sequence at a time. Parents set a budget in real currency, which gets converted to FAMCOINS and distributed equally across all tasks. The system automatically generates daily task completions for the entire sequence period based on group scheduling.

### User Journey

**Entry**: Parent taps floating action button "Create Sequence" from Tasks tab → Modal slides up

**Step 1 - Select Child**: Choose which child this sequence is for from list of child profiles

**Step 2 - Sequence Settings**: Configure period type (Weekly/Fortnightly/Monthly), start date, and budget with live FAMCOIN conversion

**Step 3 - Groups Setup**: Create contextual task groups with custom names and active day scheduling (Mon-Sun selection)

**Step 4 - Add Tasks**: For each group, select tasks from categorized template library using flowing pills interface with search

**Step 5 - Review & Create**: Summary of all settings with edit capabilities and final creation action

**Success**: Modal dismisses, returns to Tasks tab showing new sequence with today's tasks

### Key UX Principles

- **Progressive Disclosure**: Each step focuses on one decision, building complexity gradually
- **Visual State Management**: Clear progress indication, selection states, and validation feedback
- **Flexible Editing**: Can return to any previous step to modify selections
- **Immediate Feedback**: Live calculations, visual selection states, and real-time validation
- **Mobile-First**: Optimized for touch interaction with proper spacing and gesture support

### Technical Architecture

- **Redux State Management**: Centralized wizard state with persistence during app backgrounding
- **Modal Navigation**: React Navigation stack with custom header and progress tracking
- **API Integration**: Supabase backend with transaction-based creation for data integrity
- **Real-time Calculations**: FAMCOIN distribution, task counting, and validation checks
- **Offline Support**: Local state management with background sync on completion

---

# Implementation Task List

## Core Development Tasks

1. ✅ **Redux State Setup** - Create sequence creation state management
2. ✅ **Modal Navigator Setup** - Create modal stack navigator for sequence creation
3. ✅ **Entry Point Integration** - Add floating action button to Tasks tab
4. ✅ **Select Child Screen** - First step of sequence creation wizard
5. ✅ **Sequence Settings Screen** - Configure period, dates, budget, ongoing setting
6. ✅ **Groups Setup Screen** - Create and manage task groups with day selection
7. ✅ **Add Tasks Screen** - Task selection with categories and flowing pills layout
8. ✅ **Review & Create Screen** - Summary and final creation step
9. ✅ **API Integration** - Connect to Supabase for sequence creation
10. ✅ **Success Flow & Navigation** - Handle completion and return to Tasks tab

---

# Detailed Implementation Prompts

## Task 1: Redux State Setup

**Objective**: Create comprehensive Redux state management for the sequence creation wizard flow.

**Requirements**:
- Create a new Redux slice for `sequenceCreation` with RTK
- State should track: selectedChildId, sequenceSettings (period, startDate, budget, currencyCode), groups array, selectedTasksByGroup object, currentStep, isLoading, error states
- Include actions for: setSelectedChild, updateSequenceSettings, addGroup, updateGroup, deleteGroup, setCurrentStep, addTaskToGroup, removeTaskFromGroup, resetWizard, setLoading, setError
- Add selectors for: getSelectedChild, getSequenceSettings, getGroups, getTasksForGroup, getCurrentStep, getTotalTaskCount, getIsValid (validation for each step)
- Integrate with existing Redux store structure
- Add Redux Persist configuration for wizard state (should persist during app backgrounding but clear on completion)
- Include proper TypeScript interfaces for all state shapes
- Add validation logic for each step (child selected, settings complete, at least one group with tasks, etc.)

**Technical Notes**: Use RTK createSlice pattern. Follow existing Redux patterns in codebase. Include proper error handling and loading states for async operations.

---

## Task 2: Modal Navigator Setup

**Objective**: Create modal stack navigator for the sequence creation wizard with proper navigation flow and progress tracking.

**Requirements**:
- Create SequenceCreationNavigator using React Navigation modal stack
- Configure 5 screens: SelectChild, SequenceSettings, GroupsSetup, AddTasks, ReviewCreate
- Implement custom header with "Cancel" button (left), "Create Sequence" title (center), progress dots (below title)
- Progress dots should show current step visually (filled vs outlined circles)
- Cancel button should show confirmation alert if user has entered data, then reset Redux state and dismiss modal
- Configure modal presentation style for iOS (slide up from bottom)
- Handle hardware back button appropriately for iOS
- Add navigation guards to prevent advancing without completing current step
- Pass necessary props/params between screens
- Configure transitions and animations for smooth UX

**Technical Notes**: Use @react-navigation/native and @react-navigation/stack. Follow React Navigation v6 patterns. Ensure proper TypeScript navigation types.

---

## Task 3: Entry Point Integration

**Objective**: Add floating action button to existing Tasks tab that launches sequence creation flow.

**Requirements**:
- Add floating action button to Tasks tab (bottom-right positioning)
- Button should have "+" icon and "Create Sequence" accessibility label
- Position should not interfere with existing UI elements
- On press, dispatch Redux action to initialize wizard and navigate to SequenceCreationNavigator
- Only show button when user has at least one child profile
- Add subtle animation/bounce effect on press
- Follow iOS design guidelines for floating action buttons
- Button should be styled consistently with app theme
- Handle edge cases (no children, network offline, etc.)

**Technical Notes**: Use existing button components if available. Position with absolute positioning or appropriate layout. Integrate with existing Tasks tab structure without breaking current functionality.

---

## Task 4: Select Child Screen

**Objective**: Build first wizard step allowing parent to select which child the sequence is for.

**Requirements**:
- Screen displays "Select Child" heading with current step indicator
- Render list of child cards from Redux state (children should come from existing children slice)
- Each card shows: child avatar (with fallback), name, age in parentheses
- Cards should be tappable with visual feedback (highlight, scale animation)
- Single selection only - tapping new card deselects previous
- Show checkmark overlay on selected card
- "Next" button appears bottom-right only when child selected
- Connect to Redux: dispatch setSelectedChild action on selection, read selectedChildId for current selection
- Handle empty state if no children exist (shouldn't happen due to entry point guard, but handle gracefully)
- Proper loading states and error handling
- Accessibility support with proper labels and hints

**Technical Notes**: Use FlatList or ScrollView for child list. Implement proper React Native animations for selection feedback. Follow existing card design patterns from app.

---

## Task 5: Sequence Settings Screen

**Objective**: Build sequence configuration step with period type, dates, and budget.

**Requirements**:
- Screen displays "Sequence Settings" heading
- Period Type section with radio buttons: Weekly, Fortnightly, Monthly (single selection)
- Start Date section with date display and calendar icon - tapping opens native date picker modal
- Budget section with currency input field that accepts decimal values
- Show live FAMCOIN conversion below budget input (use conversion rate from profile or default 10:1)
- Update conversion in real-time as user types
- Connect to Redux: dispatch updateSequenceSettings with all field changes
- Validation: all fields required, start date cannot be in past, budget must be positive
- "Next" button enabled only when validation passes
- Proper keyboard handling (numeric for budget, dismiss on outside tap)
- Currency formatting based on user's locale/currency setting

**Technical Notes**: Use @react-native-community/datetimepicker for date selection. Implement proper input validation and formatting. Handle currency input with proper decimal handling.

---

## Task 6: Groups Setup Screen

**Objective**: Build group creation and management interface with day selection.

**Requirements**:
- Screen displays "Create Groups" heading
- Show list of created groups as cards, each displaying: group name, selected active days as pill indicators (Mon, Tue, Wed, etc.), delete X button top-right
- "Add Group" button at bottom creates new group in edit mode
- Edit mode shows: text input for group name (auto-focus), day selector with 7 pill buttons for each day (Mon-Sun)
- Day pills toggle on/off with tap, visual difference between selected/unselected
- Validate group name (required, not empty after trim, unique names)
- Save group when user taps outside or confirms, cancel if name invalid
- Swipe-to-delete functionality for group cards OR tap X button
- Groups can be reordered (optional enhancement)
- Connect to Redux: dispatch addGroup, updateGroup, deleteGroup actions
- "Next" enabled when at least one group exists with valid name and at least one active day
- Proper keyboard handling and input validation
- Confirmation alert for group deletion if group has tasks assigned

**Technical Notes**: Use proper iOS text input patterns. Implement swipe gestures for delete. Handle keyboard avoiding view. Consider using react-native-reanimated for smooth animations.

---

## Task 7: Add Tasks Screen

**Objective**: Build task selection interface with categories, search, and flowing pills layout.

**Requirements**:
- Screen title shows "Add Tasks: [Group Name]" with progress indicator "(X of Y groups)"
- Search bar at top with placeholder "Search tasks" - filters across all categories in real-time
- Vertical scrolling list of collapsible category sections loaded from existing task_categories and task_templates
- Each category section has: icon, name, expand/collapse arrow, task count
- When expanded, shows flowing pills layout of available tasks with variable widths
- Pills use task template names, have outlined state (not selected) and filled state (selected)
- Single tap toggles selection with smooth animation
- Support for "Create Custom Task" option in each category (creates new task template)
- Bottom counter shows "Selected: X tasks"
- Handle multiple groups: "Next" advances to next group's task selection, or Review screen if last group
- Connect to Redux: dispatch addTaskToGroup/removeTaskFromGroup, read selectedTasksByGroup
- Fetch task templates from Supabase with proper loading/error states
- Categories should expand/collapse with smooth animations
- Search should be debounced and performant
- Handle empty states (no tasks in category, no search results)

**Technical Notes**: Use FlatList with horizontal wrapping for pills layout. Implement proper search with debouncing. Handle async data loading with suspense or loading states. Consider react-native-super-grid for pills layout.

---

## Task 8: Review & Create Screen

**Objective**: Build summary screen with edit functionality and final creation action.

**Requirements**:
- Screen displays "Review Sequence" heading
- First summary card shows: selected child (avatar, name), period details (Weekly • Jan 15-21 format), budget with FAMCOIN conversion
- Each group displays as separate card: group icon/emoji, name, active days summary, bulleted task list, task count, "Edit" button top-right
- Cards should be scrollable if content exceeds screen
- Edit buttons navigate back to corresponding wizard step while preserving state
- Bottom "Create Sequence" button spans full width (primary CTA styling)
- Connect to Redux: read all wizard state for display, dispatch creation action
- Handle loading state on Create button (show spinner, disable interaction)
- Validation check before allowing creation (all required data present)
- Proper formatting for dates, currency, and task lists
- Handle edge cases (empty groups, no tasks selected)

**Technical Notes**: Use proper iOS button styling for primary CTA. Implement navigation back to specific steps with state preservation. Handle async creation with proper loading states.

---

## Task 9: API Integration

**Objective**: Connect sequence creation to Supabase backend with proper error handling.

**Requirements**:
- Create API functions for sequence creation using existing Supabase client
- Implement createSequence function that: creates sequence record, creates groups records, creates task_instances records, generates task_completions for entire sequence period, calculates FAMCOIN distribution
- FAMCOIN calculation: (budget_famcoins ÷ total_tasks) rounded down, remainder distributed to first tasks
- Use database transactions to ensure data consistency
- Handle all error scenarios: network errors, validation errors, database constraints
- Implement proper retry logic for failed requests
- Connect to Redux: dispatch async thunk for creation, handle loading/success/error states
- Generate task_completions for every active day in the sequence period for each task
- Respect group active days when generating completions
- Handle timezone considerations for date calculations
- Proper error messages for user display
- Update existing children/sequences state after successful creation

**Technical Notes**: Use RTK Query or createAsyncThunk for API calls. Implement proper error boundaries. Follow existing API patterns in codebase. Use Supabase transactions for data integrity.

---

## Task 10: Success Flow & Navigation

**Objective**: Handle successful sequence creation with user feedback and navigation.

**Requirements**:
- Show success animation/feedback after sequence creation completes
- Dismiss modal navigator and return to Tasks tab
- Tasks tab should refresh to show new sequence with today's tasks
- Reset sequence creation Redux state completely
- Show success toast/notification with sequence name and child
- Handle edge cases: creation success but navigation fails, partial success scenarios
- Update relevant Redux slices (sequences, tasks) with new data
- Proper loading state management throughout flow
- Handle background app scenarios (user backgrounds app during creation)
- Analytics tracking for sequence creation completion (if analytics implemented)
- Ensure proper memory cleanup and state reset
- Handle rapid successive creations (prevent double-creation)

**Technical Notes**: Use existing navigation patterns. Implement proper state cleanup. Consider using React Navigation's reset action for clean navigation state.

---

## General Implementation Guidelines

**Code Organization**:
- Follow existing TypeScript patterns and interfaces
- Use existing UI components where possible, create new ones following established design patterns
- Organize code logically with good separation of concerns
- Create reusable components for common wizard patterns

**User Experience**:
- Implement proper accessibility labels and hints
- Handle iOS-specific behavior (safe areas, keyboard avoiding, etc.)
- Add proper error boundaries and fallback states
- Use existing theme/styling system
- Include proper loading states and user feedback

**Quality & Performance**:
- Test edge cases and error scenarios
- Follow React Native best practices for performance
- Implement proper memory management and cleanup
- Add comprehensive error handling with user-friendly messages
- Ensure smooth animations and responsive interactions

**Integration**:
- Connect seamlessly with existing Redux store structure
- Use established API patterns and error handling
- Maintain consistency with existing navigation flows
- Follow established patterns for offline support and state persistence