# Toast Notifications Test Checklist

## Overview

This checklist ensures all toast notifications are working correctly for the Manual Job Creation with Duplicate Prevention feature.

## Test Environment Setup

1. Start the backend server
2. Start the frontend development server
3. Log in as a user with appropriate permissions
4. Open browser developer console to monitor for errors

## Test Cases

### 1. Job Creation - Success Scenarios

#### Test 1.1: Create Job Successfully (No Duplicates)
- [ ] Navigate to Jobs page
- [ ] Click "Create Job" button
- [ ] Fill in all required fields:
  - Title: "Test Project Alpha"
  - Client: "New Client Corp"
  - Team: Select any team
  - Start Date: Tomorrow's date
  - End Date: Date 30 days from now
- [ ] Wait for automatic duplicate check to complete
- [ ] Verify success toast: "No duplicates found - safe to proceed"
- [ ] Click "Create Job" button
- [ ] **Expected**: Success toast appears: "Job 'Test Project Alpha' created successfully!"
- [ ] **Expected**: Modal closes
- [ ] **Expected**: Jobs list refreshes with new job

#### Test 1.2: Create Job with Duplicate Override
- [ ] Click "Create Job" button
- [ ] Fill in fields matching an existing job:
  - Title: Use title of existing active job
  - Client: Use client of existing active job
  - Team: Select any team
  - Start Date: Tomorrow's date
  - End Date: Date 30 days from now
- [ ] Wait for automatic duplicate check
- [ ] **Expected**: Warning toast appears: "Found X similar job(s) for this client"
- [ ] **Expected**: Duplicate Warning Dialog opens
- [ ] Click "Create Anyway" button
- [ ] **Expected**: Warning toast appears: "Please provide a justification for creating this duplicate job"
- [ ] **Expected**: Justification text field appears
- [ ] Enter justification: "This is a different phase of the project"
- [ ] Click "Confirm & Create" button
- [ ] **Expected**: Success toast appears: "Job 'Test Project Alpha' created successfully (duplicate override applied)"
- [ ] **Expected**: Both dialogs close
- [ ] **Expected**: Jobs list refreshes

### 2. Job Creation - Validation Errors

#### Test 2.1: Submit Empty Form
- [ ] Click "Create Job" button
- [ ] Leave all fields empty
- [ ] Try to click "Create Job" button (should be disabled)
- [ ] **Expected**: Button is disabled, no toast shown

#### Test 2.2: Submit Incomplete Form
- [ ] Click "Create Job" button
- [ ] Fill only Title field: "Incomplete Job"
- [ ] Click outside the field to trigger validation
- [ ] **Expected**: Inline validation errors appear
- [ ] Try to submit (button should be disabled)
- [ ] **Expected**: No toast shown (inline errors sufficient)

#### Test 2.3: Invalid Date Range
- [ ] Click "Create Job" button
- [ ] Fill all fields but set:
  - Start Date: Tomorrow
  - End Date: Today (before start date)
- [ ] Click outside end date field
- [ ] **Expected**: Inline error: "End date must be after start date"
- [ ] Try to submit (button should be disabled)
- [ ] **Expected**: No toast shown (inline errors sufficient)

### 3. Job Creation - API Errors

#### Test 3.1: Network Error During Creation
- [ ] Open browser DevTools → Network tab
- [ ] Click "Create Job" button
- [ ] Fill in all required fields correctly
- [ ] Before clicking "Create Job", set network to "Offline" in DevTools
- [ ] Click "Create Job" button
- [ ] **Expected**: Error toast appears: "Failed to create job. Please try again."
- [ ] **Expected**: Modal remains open
- [ ] Set network back to "Online"

#### Test 3.2: Server Error During Creation
- [ ] (This requires backend to return an error - skip if not possible)
- [ ] **Expected**: Error toast with server error message

### 4. Duplicate Detection

#### Test 4.1: Automatic Duplicate Check
- [ ] Click "Create Job" button
- [ ] Start typing in Title field: "Website"
- [ ] Type in Client field: "Acme Corp" (existing client with active jobs)
- [ ] Wait 800ms (debounce delay)
- [ ] **Expected**: Loading indicator appears briefly
- [ ] **Expected**: If duplicates found, warning toast: "Found X similar job(s) for this client"
- [ ] **Expected**: Warning alert appears in modal

#### Test 4.2: Manual Duplicate Check
- [ ] Click "Create Job" button
- [ ] Fill in Title and Client fields
- [ ] Click "Check Duplicates" button
- [ ] **Expected**: Button shows loading state
- [ ] If no duplicates: **Expected**: Success toast: "No duplicates found - safe to proceed"
- [ ] If duplicates found: **Expected**: Warning toast: "Found X similar job(s) for this client"

#### Test 4.3: Duplicate Check Failure
- [ ] Open browser DevTools → Network tab
- [ ] Click "Create Job" button
- [ ] Fill in Title and Client fields
- [ ] Set network to "Offline"
- [ ] Wait for automatic duplicate check or click "Check Duplicates"
- [ ] **Expected**: Error toast: "Failed to check for duplicates. You can still proceed with creation."
- [ ] **Expected**: Error alert appears in modal
- [ ] **Expected**: Can still proceed with job creation
- [ ] Set network back to "Online"

### 5. Duplicate Warning Dialog

#### Test 5.1: View Existing Job
- [ ] Trigger duplicate warning (see Test 1.2)
- [ ] Click "View Existing" button
- [ ] **Expected**: Success toast: "Navigating to job #X"
- [ ] **Expected**: Modal closes

#### Test 5.2: Cancel Duplicate Warning
- [ ] Trigger duplicate warning
- [ ] Click "Cancel" button
- [ ] **Expected**: No toast shown
- [ ] **Expected**: Dialog closes
- [ ] **Expected**: Create Job Modal remains open

#### Test 5.3: Create Anyway Without Justification
- [ ] Trigger duplicate warning
- [ ] Click "Create Anyway" button
- [ ] **Expected**: Warning toast: "Please provide a justification for creating this duplicate job"
- [ ] **Expected**: Justification field appears
- [ ] Click "Confirm & Create" without entering text
- [ ] **Expected**: Button is disabled
- [ ] **Expected**: No additional toast

#### Test 5.4: Create Anyway With Justification
- [ ] Trigger duplicate warning
- [ ] Click "Create Anyway" button
- [ ] Enter justification: "Different project scope"
- [ ] Click "Confirm & Create" button
- [ ] **Expected**: Success toast: "Job 'X' created successfully (duplicate override applied)"
- [ ] **Expected**: Both dialogs close

### 6. Invoice Linking

#### Test 6.1: Link Invoice to Single Matching Job
- [ ] Navigate to Finance → Invoices tab
- [ ] Create or select an invoice for a client with exactly one active job
- [ ] Mark invoice as paid
- [ ] **Expected**: Success toast: "Invoice X created successfully! Automatically linked to existing job #Y."
- [ ] **Expected**: No job selection dialog appears

#### Test 6.2: Link Invoice to Multiple Matching Jobs
- [ ] Create or select an invoice for a client with multiple active jobs
- [ ] Mark invoice as paid
- [ ] **Expected**: Success toast: "Payment updated! Please select which job to link this invoice to."
- [ ] **Expected**: Job Selection Dialog opens
- [ ] Select a job from the list
- [ ] Click "Link to Job" button
- [ ] **Expected**: Info toast: "Linking invoice X to job 'Y'..."
- [ ] **Expected**: Success toast: "Invoice X successfully linked to job: Y"
- [ ] **Expected**: Dialog closes

#### Test 6.3: Create New Job from Invoice
- [ ] Trigger job selection dialog (see Test 6.2)
- [ ] Click "Create New Job Instead" button
- [ ] **Expected**: Info toast: "Creating new job for this invoice..."
- [ ] **Expected**: Success toast: "Creating new job for this invoice..."
- [ ] **Expected**: Dialog closes

#### Test 6.4: Cancel Job Selection
- [ ] Trigger job selection dialog
- [ ] Click "Cancel" button
- [ ] **Expected**: Info toast: "Invoice linking cancelled"
- [ ] **Expected**: Dialog closes

#### Test 6.5: Link Invoice Without Selecting Job
- [ ] Trigger job selection dialog
- [ ] Don't select any job
- [ ] Click "Link to Job" button (should be disabled)
- [ ] **Expected**: Button is disabled
- [ ] **Expected**: No toast shown

#### Test 6.6: Invoice Linking Failure
- [ ] Trigger job selection dialog
- [ ] Set network to "Offline" in DevTools
- [ ] Select a job
- [ ] Click "Link to Job" button
- [ ] **Expected**: Error toast: "Failed to link invoice to job. Please try again."
- [ ] **Expected**: Dialog remains open
- [ ] Set network back to "Online"

### 7. Jobs Page Integration

#### Test 7.1: Job Creation Success from Jobs Page
- [ ] Navigate to Jobs page
- [ ] Click "Create Job" button
- [ ] Complete job creation successfully
- [ ] **Expected**: Success toast from CreateJobModal
- [ ] **Expected**: Modal closes
- [ ] **Expected**: Jobs list refreshes automatically
- [ ] **Expected**: New job appears in the list

### 8. Toast Behavior

#### Test 8.1: Toast Auto-Dismiss
- [ ] Trigger any success toast
- [ ] Wait 4 seconds
- [ ] **Expected**: Toast automatically disappears

#### Test 8.2: Toast Manual Dismiss
- [ ] Trigger any toast
- [ ] Click the X button on the toast
- [ ] **Expected**: Toast immediately disappears

#### Test 8.3: Multiple Toasts Stacking
- [ ] Quickly trigger multiple actions that show toasts
- [ ] **Expected**: Toasts stack vertically
- [ ] **Expected**: Each toast is visible
- [ ] **Expected**: Toasts dismiss in order (oldest first)

#### Test 8.4: Toast Position
- [ ] Trigger any toast
- [ ] **Expected**: Toast appears at bottom-right of screen
- [ ] **Expected**: Toast doesn't overlap with important UI elements

### 9. Edge Cases

#### Test 9.1: Rapid Form Changes
- [ ] Click "Create Job" button
- [ ] Rapidly type and delete in Title and Client fields
- [ ] **Expected**: Duplicate check debounces (doesn't fire on every keystroke)
- [ ] **Expected**: Only one duplicate check runs after typing stops

#### Test 9.2: Close Modal During API Call
- [ ] Click "Create Job" button
- [ ] Fill in all fields
- [ ] Click "Create Job" button
- [ ] Immediately try to close the modal
- [ ] **Expected**: Modal doesn't close while API call is in progress
- [ ] **Expected**: Close button is disabled

#### Test 9.3: Multiple Duplicate Checks
- [ ] Click "Create Job" button
- [ ] Fill in Title and Client
- [ ] Wait for automatic duplicate check
- [ ] Change Title slightly
- [ ] Wait for another automatic check
- [ ] **Expected**: Each check shows appropriate toast
- [ ] **Expected**: Previous check results are cleared

## Test Results Summary

### Pass/Fail Criteria

- **Pass**: All expected toasts appear with correct messages and types
- **Fail**: Any toast is missing, has wrong message, or wrong type

### Test Execution Date: ___________

### Tester Name: ___________

### Results:

| Test Category | Tests Passed | Tests Failed | Notes |
|--------------|--------------|--------------|-------|
| Job Creation Success | __ / 2 | __ / 2 | |
| Validation Errors | __ / 3 | __ / 3 | |
| API Errors | __ / 2 | __ / 2 | |
| Duplicate Detection | __ / 3 | __ / 3 | |
| Duplicate Warning | __ / 4 | __ / 4 | |
| Invoice Linking | __ / 6 | __ / 6 | |
| Jobs Page | __ / 1 | __ / 1 | |
| Toast Behavior | __ / 4 | __ / 4 | |
| Edge Cases | __ / 3 | __ / 3 | |
| **TOTAL** | **__ / 28** | **__ / 28** | |

### Issues Found:

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Recommendations:

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

## Automated Testing

For automated testing, use the following test structure:

```typescript
describe('Toast Notifications', () => {
  it('shows success toast when job is created', async () => {
    // Arrange
    render(<CreateJobModal open={true} onClose={jest.fn()} />);
    
    // Act
    fillForm({ title: 'Test Job', client: 'Test Client', ... });
    clickButton('Create Job');
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });
  });
  
  it('shows error toast when job creation fails', async () => {
    // Arrange
    mockApiError();
    render(<CreateJobModal open={true} onClose={jest.fn()} />);
    
    // Act
    fillForm({ title: 'Test Job', client: 'Test Client', ... });
    clickButton('Create Job');
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/failed to create job/i)).toBeInTheDocument();
    });
  });
});
```

## Conclusion

This comprehensive test checklist ensures that all toast notifications are working correctly across the entire Manual Job Creation with Duplicate Prevention feature. Complete all tests and document any issues found.
