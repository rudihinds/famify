# Test Improvement Guide: From Implementation to Behavior

## ❌ Implementation-Focused Tests (What NOT to do)

### Example 1: Testing Text Exists
```javascript
// BAD: Just checking if text exists
test('renders daily tasks correctly', async () => {
  expect(getByText("My Tasks")).toBeTruthy();
  expect(getByText('Make Bed')).toBeTruthy();
});
```

**Problems:**
- Tests implementation detail (exact text)
- Doesn't test what the user actually experiences
- Brittle - breaks if text changes slightly

### Example 2: Testing Props Directly
```javascript
// BAD: Checking internal props
test('validates all required fields before enabling submit', () => {
  const addButtonContainer = getByText('Add Child').parent;
  expect(addButtonContainer?.props.disabled).toBe(true);
});
```

**Problems:**
- Tests React implementation details
- Doesn't test actual user interaction
- Coupled to component structure

### Example 3: Testing Mock Calls
```javascript
// BAD: Just verifying mocks were called
test('creates child profile', async () => {
  fireEvent.press(getByText('Add Child'));
  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith('children');
  });
});
```

**Problems:**
- Tests mocking setup, not behavior
- Doesn't verify user-facing outcomes
- Tests implementation of data layer

## ✅ Behavior-Focused Tests (What TO do)

### Example 1: Testing User Experience
```javascript
// GOOD: Testing what user sees and can do
test('child sees all assigned tasks for today with relevant information', async () => {
  // Setup
  const todaysTasks = [
    createMockTask({ taskName: 'Make Bed', famcoinValue: 3 }),
    createMockTask({ taskName: 'Homework', famcoinValue: 5 }),
  ];
  
  // Render
  const { getByText } = renderWithProviders(<TasksScreen />);
  
  // User should see their tasks
  await waitFor(() => {
    expect(getByText('Make Bed')).toBeTruthy();
    expect(getByText('Homework')).toBeTruthy();
  });
  
  // User should see rewards they can earn
  expect(getByText('3 FC')).toBeTruthy();
  expect(getByText('5 FC')).toBeTruthy();
});
```

**Why it's better:**
- Tests complete user scenario
- Verifies information user needs to see
- Tests business value (tasks + rewards)

### Example 2: Testing User Interactions
```javascript
// GOOD: Testing complete interaction flow
test('parent must provide all required information before adding child', async () => {
  const onChildCreated = jest.fn();
  const { getByPlaceholderText, getByText } = renderWithProviders(
    <QRCodeGenerator onChildCreated={onChildCreated} />
  );

  const addButton = getByText('Add Child');

  // User tries to submit empty form - nothing happens
  fireEvent.press(addButton);
  expect(onChildCreated).not.toHaveBeenCalled();

  // User fills partial form - still can't submit
  fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
  fireEvent.press(addButton);
  expect(onChildCreated).not.toHaveBeenCalled();

  // User completes all required fields
  fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
  fireEvent.press(getByText('Education'));
  
  // Now submission works
  fireEvent.press(addButton);
  await waitFor(() => {
    expect(onChildCreated).toHaveBeenCalled();
  });
});
```

**Why it's better:**
- Tests actual user behavior
- Verifies form validation works
- Tests complete interaction flow

### Example 3: Testing Error Handling
```javascript
// GOOD: Testing how errors are communicated to user
test('parent is informed when adding child fails', async () => {
  // Setup failure scenario
  setupDatabaseError();
  
  const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(
    <QRCodeGenerator />
  );

  // Parent completes form
  fillCompleteForm();
  fireEvent.press(getByText('Add Child'));

  await waitFor(() => {
    // Parent should NOT see success
    expect(queryByText(/Added Successfully/)).toBeFalsy();
    // Parent should still be on form to try again
    expect(getByText('Add Child Info')).toBeTruthy();
  });
});
```

**Why it's better:**
- Tests user experience during errors
- Verifies recovery path
- Focuses on what user sees, not internal errors

## Key Principles

### 1. Test User Stories
Instead of: "Component renders with correct props"
Test: "User can complete their intended task"

### 2. Test Outcomes, Not Implementation
Instead of: "Redux action is dispatched"
Test: "User sees updated information after action"

### 3. Test Interactions, Not State
Instead of: "State.isLoading === true"
Test: "User sees loading indicator while waiting"

### 4. Test Error Recovery
Instead of: "Error is logged to console"
Test: "User can recover from error and try again"

### 5. Test Complete Flows
Instead of: "Button click calls function"
Test: "User can complete entire workflow"

## Refactoring Checklist

When reviewing existing tests, ask:

1. **What is the user trying to do?** - Test should reflect user goal
2. **What should the user see?** - Test visual feedback
3. **What can the user do next?** - Test available actions
4. **What happens on error?** - Test error recovery
5. **Does test break if implementation changes?** - Should only break if behavior changes

## Common Anti-Patterns to Avoid

1. **Testing component internals** - Props, state, component structure
2. **Testing exact text matches** - Use patterns or test meaning
3. **Testing style classes** - Test visual behavior instead
4. **Testing mock implementations** - Test actual outcomes
5. **Leaving debug code** - Remove console.logs, debug()
6. **Testing for sake of coverage** - Test meaningful behavior

## Example: Full Behavioral Test Suite Structure

```javascript
describe('Feature: Task Completion', () => {
  describe('Viewing tasks', () => {
    test('user sees today\'s assigned tasks');
    test('user sees tasks organized by time of day');
    test('user can distinguish completed from pending tasks');
  });
  
  describe('Completing tasks', () => {
    test('user can mark simple task as complete');
    test('user must provide photo when required');
    test('user sees confirmation after completion');
  });
  
  describe('Handling errors', () => {
    test('user can retry after network error');
    test('user sees helpful message on photo upload failure');
  });
});
```

This structure focuses on user capabilities and experiences, not technical implementation.