# JWT Authentication Integration

## Overview

The frontend has been properly configured to work with the existing FastAPI backend authentication system. Here's how the JWT authentication works:

## Backend Endpoints Used

The frontend integrates with these backend endpoints:

1. **POST /api/v1/auth/login** - User login
2. **GET /api/v1/auth/me** - Get current user profile
3. **POST /api/v1/auth/register** - Register new user (Admin only)

## Authentication Flow

### 1. Login Process
```typescript
// User submits login form
const loginResult = await loginMutation(credentials).unwrap();
// Backend returns: { access_token, token_type, role }

// Store token and fetch user profile
dispatch(loginSuccess(loginResult));
const userResult = await getCurrentUser().unwrap();
dispatch(setUser(userResult));
```

### 2. Token Storage
- Access token is stored in localStorage
- Token is automatically included in API requests via Redux middleware
- No refresh token needed (backend handles token expiration)

### 3. Protected Routes
- All routes except `/login` are protected
- Users are redirected to login if not authenticated
- Role-based access control for different modules

## Data Structures

### Backend Response (Login)
```typescript
interface LoginResponse {
  access_token: string;
  token_type: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'STAFF';
}
```

### Backend Response (User Profile)
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'STAFF';
  is_active: boolean;
  team_id?: number;
  created_at: string;
  updated_at?: string;
}
```

## API Integration

### Base API Configuration
```typescript
// Automatically adds Bearer token to all requests
prepareHeaders: (headers, { getState }) => {
  const token = (getState() as RootState).auth.accessToken;
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return headers;
}
```

### Authentication State
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

## Role-Based Access

### User Roles
- **ADMIN**: Full system access, user management, global reporting
- **SUPERVISOR**: Team management, job oversight, task assignment
- **STAFF**: Task execution, attendance tracking, personal reporting

### Navigation Access
Each navigation item has role restrictions:
```typescript
{
  id: 'users',
  label: 'Users',
  path: '/users',
  roles: ['ADMIN'], // Only admins can access
}
```

## Environment Setup

Create a `.env` file in the frontend root:
```env
VITE_API_URL=http://localhost:8000
```

## Testing the Authentication

1. **Start the backend server:**
   ```bash
   cd ../
   python run.py
   ```

2. **Start the frontend:**
   ```bash
   cd henam-frontend
   npm run dev
   ```

3. **Test login:**
   - Go to `http://localhost:5173`
   - Use admin credentials (if you have them)
   - Or create a test user through the backend

## Error Handling

The authentication system includes comprehensive error handling:
- Network errors
- Invalid credentials
- Token expiration
- Server errors

All errors are displayed to the user via snackbar notifications.

## Security Features

- JWT tokens stored securely in localStorage
- Automatic token inclusion in API requests
- Role-based route protection
- Session persistence across browser refreshes
- Automatic logout on token expiration

## Next Steps

1. **Create test users** in the backend
2. **Test the login flow** with different user roles
3. **Implement additional features** like password reset
4. **Add more robust error handling** for edge cases
5. **Implement token refresh** if needed

The authentication system is now fully integrated and ready for use!
