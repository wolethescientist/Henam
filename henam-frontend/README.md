# Henam Task Management Frontend

A modern React.js frontend application for the Henam Facility Management Task Management System.

## Features

- **Modern UI**: Built with Material-UI v5 and custom green theme
- **Role-based Access**: Different dashboards for Admin, Supervisor, and Staff users
- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Authentication**: JWT-based authentication with role-based routing
- **State Management**: Redux Toolkit with RTK Query for API management
- **TypeScript**: Full TypeScript support for type safety

## Tech Stack

- React 18+ with TypeScript
- Vite (build tool)
- Material-UI v5
- Redux Toolkit + RTK Query
- React Router v6
- React Hook Form + Yup validation
- Chart.js for analytics
- Day.js for date handling

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp env.example .env
```

3. Update the API URL in `.env`:
```
VITE_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── common/         # Generic components
│   └── layout/         # Layout components
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   ├── jobs/           # Job management pages
│   ├── tasks/          # Task management pages
│   ├── invoices/       # Invoice management pages
│   ├── attendance/     # Attendance tracking pages
│   ├── reports/        # Reporting pages
│   ├── users/          # User management pages
│   └── teams/          # Team management pages
├── store/              # Redux store configuration
│   ├── api/            # RTK Query API services
│   └── slices/         # Redux slices
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── constants/          # Application constants
└── theme/              # Material-UI theme configuration
```

## User Roles

### Admin
- Full system access
- User management
- Team management
- Global reporting
- Financial overview

### Supervisor
- Team management
- Job oversight
- Task assignment
- Team reporting
- Invoice management

### Staff
- Task execution
- Attendance tracking
- Personal reporting
- Check-in/out functionality

## API Integration

The frontend integrates with the FastAPI backend through RTK Query. All API endpoints are defined in the `store/api/` directory.

## Theme

The application uses a custom green theme based on the Henam brand colors:
- Primary: #2e7d32 (Dark Green)
- Secondary: #4caf50 (Green)
- Accent colors for different statuses and priorities

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- Use TypeScript for all components
- Follow React best practices
- Use Material-UI components consistently
- Implement proper error handling
- Write responsive components

## Deployment

1. Build the application:
```bash
npm run build
```

2. The built files will be in the `dist/` directory

3. Deploy the `dist/` directory to your static hosting service

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new components
3. Test your changes thoroughly
4. Follow the established naming conventions
5. Update documentation as needed

## License

This project is part of the Henam Facility Management System.