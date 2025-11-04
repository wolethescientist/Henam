# Global CRUD Feedback System

A comprehensive feedback system for all Create, Read, Update, and Delete operations across the application. This system provides consistent loading states, success messages, and error handling with beautiful animations and user-friendly interfaces.

## Features

- ✅ **Loading States**: Visual loading indicators for all CRUD operations
- ✅ **Success Messages**: Automatic success notifications with customizable messages
- ✅ **Error Handling**: User-friendly error messages with proper error handling
- ✅ **Consistent UX**: Same feedback pattern across all modules (Tasks, Jobs, Users, Teams)
- ✅ **Responsive Design**: Works perfectly on mobile and desktop
- ✅ **Smooth Animations**: Beautiful transitions and animations using Framer Motion
- ✅ **TypeScript Support**: Full type safety and IntelliSense support

## Components

### 1. Hooks

#### `useLoading`
Manages loading states for individual components.

```typescript
import { useLoading } from '../hooks/useLoading';

const { loading, setLoading, startLoading, stopLoading, withLoading } = useLoading();

// Start loading
startLoading('Creating task...', 'button');

// Stop loading
stopLoading();

// Wrap async function with loading
const createTask = withLoading(
  async (taskData) => {
    const result = await api.createTask(taskData);
    return result;
  },
  'Creating task...',
  'button'
);
```

#### `useToast`
Manages toast notifications for success and error messages.

```typescript
import { useToast } from '../hooks/useToast';

const { showSuccess, showError, showWarning, showInfo } = useToast();

// Show success message
showSuccess('Task created successfully!');

// Show error message
showError('Failed to create task. Please try again.');
```

#### `useCrudFeedback`
Combines loading and toast functionality for CRUD operations.

```typescript
import { useCrudFeedback } from '../hooks/useCrudFeedback';

const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();

// Create with feedback
const handleCreate = createWithFeedback(
  async (data) => {
    const result = await api.create(data);
    return result;
  },
  {
    loadingMessage: 'Creating...',
    successMessage: 'Created successfully!',
    errorMessage: 'Failed to create. Please try again.',
    loadingType: 'button'
  }
);
```

#### `useFeedback` (Global Context)
Manages global loading states and notifications across the entire application.

```typescript
import { useFeedback } from '../contexts/FeedbackContext';

const { withGlobalLoading, showSuccess, showError } = useFeedback();

// Global loading operation
const handleGlobalOperation = withGlobalLoading(
  'operation-key',
  async (data) => {
    const result = await api.operation(data);
    return result;
  },
  {
    loadingMessage: 'Processing...',
    loadingType: 'overlay',
    successMessage: 'Operation completed!',
    errorMessage: 'Operation failed. Please try again.'
  }
);
```

### 2. Components

#### `LoadingButton`
Enhanced button component with loading state.

```typescript
import LoadingButton from '../components/common/LoadingButton';

<LoadingButton
  variant="contained"
  loading={loading.isLoading}
  loadingText="Creating..."
  onClick={handleCreate}
>
  Create Task
</LoadingButton>
```

#### `LoadingOverlay`
Full-screen loading overlay for modal operations.

```typescript
import LoadingOverlay from '../components/common/LoadingOverlay';

<LoadingOverlay
  open={loading.isLoading && loading.loadingType === 'overlay'}
  message={loading.loadingMessage}
  variant="spinner"
/>
```

#### `EnhancedSnackbar`
Beautiful toast notifications with animations.

```typescript
import EnhancedSnackbar from '../components/common/EnhancedSnackbar';

// Automatically rendered by FeedbackManager
<EnhancedSnackbar />
```

#### `SkeletonLoader`
Loading placeholders for data fetching.

```typescript
import SkeletonLoader from '../components/common/SkeletonLoader';

<SkeletonLoader 
  variant="tasks" 
  count={5}
  showHeader={true}
  showFilters={true}
/>
```

## Usage Examples

### 1. Tasks Module

```typescript
import React, { useState } from 'react';
import { useCrudFeedback } from '../hooks/useCrudFeedback';
import LoadingButton from '../components/common/LoadingButton';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();

  // Create task with feedback
  const handleCreateTask = createWithFeedback(
    async (taskData) => {
      const newTask = await api.createTask(taskData);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    },
    {
      loadingMessage: 'Creating task...',
      successMessage: 'Task created successfully!',
      errorMessage: 'Failed to create task. Please try again.',
      loadingType: 'button'
    }
  );

  // Update task with feedback
  const handleUpdateTask = updateWithFeedback(
    async (id, updates) => {
      const updatedTask = await api.updateTask(id, updates);
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
      return updatedTask;
    },
    {
      loadingMessage: 'Updating task...',
      successMessage: 'Task updated successfully!',
      errorMessage: 'Failed to update task. Please try again.',
      loadingType: 'button'
    }
  );

  // Delete task with feedback
  const handleDeleteTask = deleteWithFeedback(
    async (id) => {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    },
    {
      loadingMessage: 'Deleting task...',
      successMessage: 'Task deleted successfully!',
      errorMessage: 'Failed to delete task. Please try again.',
      loadingType: 'button'
    }
  );

  return (
    <div>
      <LoadingButton
        variant="contained"
        loading={loading.isLoading}
        loadingText="Creating..."
        onClick={() => handleCreateTask({ title: 'New Task' })}
      >
        Create Task
      </LoadingButton>
      
      {/* Task list with edit/delete buttons */}
    </div>
  );
};
```

### 2. Jobs Module

```typescript
import React from 'react';
import { useCrudFeedback } from '../hooks/useCrudFeedback';
import { useFeedback } from '../contexts/FeedbackContext';

const JobsPage = () => {
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { withGlobalLoading } = useFeedback();

  // Create job with feedback
  const handleCreateJob = createWithFeedback(
    async (jobData) => {
      const newJob = await api.createJob(jobData);
      return newJob;
    },
    {
      loadingMessage: 'Creating job...',
      successMessage: 'Job created successfully!',
      errorMessage: 'Failed to create job. Please try again.',
      loadingType: 'button'
    }
  );

  // Assign job with global loading
  const handleAssignJob = withGlobalLoading(
    'job-assignment',
    async (jobId, userId) => {
      const result = await api.assignJob(jobId, userId);
      return result;
    },
    {
      loadingMessage: 'Assigning job...',
      loadingType: 'overlay',
      successMessage: 'Job assigned successfully!',
      errorMessage: 'Failed to assign job. Please try again.'
    }
  );

  return (
    <div>
      {/* Job management interface */}
    </div>
  );
};
```

### 3. Users Module

```typescript
import React from 'react';
import { useCrudFeedback } from '../hooks/useCrudFeedback';

const UsersPage = () => {
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();

  // Create user with feedback
  const handleCreateUser = createWithFeedback(
    async (userData) => {
      const newUser = await api.createUser(userData);
      return newUser;
    },
    {
      loadingMessage: 'Creating user...',
      successMessage: 'User created successfully!',
      errorMessage: 'Failed to create user. Please try again.',
      loadingType: 'button'
    }
  );

  // Update user with feedback
  const handleUpdateUser = updateWithFeedback(
    async (id, updates) => {
      const updatedUser = await api.updateUser(id, updates);
      return updatedUser;
    },
    {
      loadingMessage: 'Updating user...',
      successMessage: 'User updated successfully!',
      errorMessage: 'Failed to update user. Please try again.',
      loadingType: 'button'
    }
  );

  return (
    <div>
      {/* User management interface */}
    </div>
  );
};
```

### 4. Teams Module

```typescript
import React from 'react';
import { useCrudFeedback } from '../hooks/useCrudFeedback';
import { useFeedback } from '../contexts/FeedbackContext';

const TeamsPage = () => {
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { withGlobalLoading } = useFeedback();

  // Create team with feedback
  const handleCreateTeam = createWithFeedback(
    async (teamData) => {
      const newTeam = await api.createTeam(teamData);
      return newTeam;
    },
    {
      loadingMessage: 'Creating team...',
      successMessage: 'Team created successfully!',
      errorMessage: 'Failed to create team. Please try again.',
      loadingType: 'button'
    }
  );

  // Add member with global loading
  const handleAddMember = withGlobalLoading(
    'team-member-add',
    async (teamId, userId) => {
      const result = await api.addMemberToTeam(teamId, userId);
      return result;
    },
    {
      loadingMessage: 'Adding member...',
      loadingType: 'button',
      successMessage: 'Member added successfully!',
      errorMessage: 'Failed to add member. Please try again.'
    }
  );

  return (
    <div>
      {/* Team management interface */}
    </div>
  );
};
```

## Configuration

### Loading Types

- `button`: Shows loading spinner on button
- `overlay`: Shows full-screen loading overlay
- `skeleton`: Shows skeleton loader for content
- `inline`: Shows inline loading indicator

### Toast Types

- `success`: Green success message
- `error`: Red error message
- `warning`: Orange warning message
- `info`: Blue info message

### Customization

You can customize the feedback system by:

1. **Modifying colors**: Update the color schemes in the components
2. **Changing animations**: Adjust Framer Motion animations
3. **Custom messages**: Provide custom success/error messages
4. **Loading durations**: Adjust auto-hide durations for toasts

## Integration Steps

1. **Import the feedback system** in your component:
   ```typescript
   import { useCrudFeedback } from '../hooks/useCrudFeedback';
   import LoadingButton from '../components/common/LoadingButton';
   ```

2. **Use the hooks** for CRUD operations:
   ```typescript
   const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
   ```

3. **Wrap your API calls** with feedback:
   ```typescript
   const handleCreate = createWithFeedback(
     async (data) => await api.create(data),
     {
       loadingMessage: 'Creating...',
       successMessage: 'Created successfully!',
       errorMessage: 'Failed to create. Please try again.',
       loadingType: 'button'
     }
   );
   ```

4. **Use LoadingButton** for buttons:
   ```typescript
   <LoadingButton
     loading={loading.isLoading}
     loadingText="Creating..."
     onClick={handleCreate}
   >
     Create
   </LoadingButton>
   ```

## Best Practices

1. **Consistent Messages**: Use consistent success/error messages across modules
2. **Appropriate Loading Types**: Use `button` for form submissions, `overlay` for complex operations, `skeleton` for data fetching
3. **Error Handling**: Always provide user-friendly error messages
4. **Loading States**: Disable buttons during loading to prevent double submissions
5. **Accessibility**: Ensure loading states are accessible to screen readers

## Troubleshooting

### Common Issues

1. **Loading state not clearing**: Make sure to call the API function properly and handle errors
2. **Toast not showing**: Check if the FeedbackManager is properly integrated in App.tsx
3. **TypeScript errors**: Ensure proper type definitions for your API responses

### Debug Tips

1. Check browser console for error messages
2. Verify that the FeedbackProvider is wrapping your app
3. Ensure API functions return proper Promise objects
4. Check that loading states are properly managed

## Examples

See the example components in `src/components/examples/`:
- `TasksWithFeedback.tsx`
- `JobsWithFeedback.tsx`
- `UsersWithFeedback.tsx`
- `TeamsWithFeedback.tsx`

These examples demonstrate the complete integration of the feedback system across all CRUD operations.
