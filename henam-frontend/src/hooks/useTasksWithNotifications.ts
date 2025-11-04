import { useCallback } from 'react';
import { 
  useCreateTaskMutation, 
  useUpdateTaskMutation, 
  useDeleteTaskMutation, 
  useUpdateTaskStatusMutation 
} from '../store/api/tasksApi';
import { useApiWithNotifications } from './useApiWithNotifications';
import type { CreateTaskForm } from '../types';

export const useTasksWithNotifications = () => {
  const { executeWithNotifications } = useApiWithNotifications();
  
  const [createTaskMutation] = useCreateTaskMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();
  const [updateTaskStatusMutation] = useUpdateTaskStatusMutation();

  const createTask = useCallback(async (taskData: CreateTaskForm) => {
    return await executeWithNotifications(
      () => createTaskMutation(taskData).unwrap(),
      {
        loadingMessage: 'Creating task...',
        successMessage: `Task "${taskData.title}" created successfully! Email notifications sent to assigner and assignee.`,
        errorMessage: 'Failed to create task',
      }
    );
  }, [createTaskMutation, executeWithNotifications]);

  const updateTask = useCallback(async (id: number, data: Partial<CreateTaskForm>) => {
    return await executeWithNotifications(
      () => updateTaskMutation({ id, data }).unwrap(),
      {
        loadingMessage: 'Updating task...',
        successMessage: `Task updated successfully! Email notifications sent to assigner and assignee.`,
        errorMessage: 'Failed to update task',
      }
    );
  }, [updateTaskMutation, executeWithNotifications]);

  const deleteTask = useCallback(async (id: number) => {
    return await executeWithNotifications(
      () => deleteTaskMutation(id).unwrap(),
      {
        loadingMessage: 'Deleting task...',
        successMessage: 'Task deleted successfully!',
        errorMessage: 'Failed to delete task',
      }
    );
  }, [deleteTaskMutation, executeWithNotifications]);

  const updateTaskStatus = useCallback(async (id: number, status: string) => {
    return await executeWithNotifications(
      () => updateTaskStatusMutation({ id, status }).unwrap(),
      {
        loadingMessage: 'Updating task status...',
        successMessage: `Task status updated to ${status}! Email notifications sent to assigner and assignee.`,
        errorMessage: 'Failed to update task status',
      }
    );
  }, [updateTaskStatusMutation, executeWithNotifications]);

  const updateTaskProgress = useCallback(async (id: number, progress: number) => {
    return await executeWithNotifications(
      () => updateTaskMutation({ id, data: { progress } }).unwrap(),
      {
        loadingMessage: 'Updating task progress...',
        successMessage: `Task progress updated to ${progress}%! Email notifications sent to assigner and assignee.`,
        errorMessage: 'Failed to update task progress',
      }
    );
  }, [updateTaskMutation, executeWithNotifications]);

  return {
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskProgress,
  };
};
