# Job Selection Dialog - Component Structure

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔧 Link Invoice to Existing Job                            │
│  Invoice INV-2024-0001 • $5,000 • Acme Corp                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ℹ️ Multiple active jobs found for Acme Corp. Please       │
│     select which job this invoice should be linked to...    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🔍 Search jobs by title, team, supervisor...       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Showing 2 active jobs found                                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ○ Website Redesign                    [In Progress] │    │
│  │   Progress: ████████░░░░░░░░░░ 45%                 │    │
│  │   👥 Development Team  👤 John Doe  📅 Jan 15, 2024│    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ● Mobile App Development          [Not Started]    │    │
│  │   Progress: ░░░░░░░░░░░░░░░░░░░░ 0%                │    │
│  │   👥 Mobile Team  👤 Jane Smith  📅 Feb 1, 2024    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ─────────────────── OR ───────────────────                │
│                                                              │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │ ➕ Create New Job Instead                          │    │
│  │    This invoice doesn't match any existing jobs    │    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                    [Cancel] [Link to Job]   │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
JobSelectionDialog
├── Dialog (MUI)
│   ├── DialogTitle
│   │   ├── Work Icon
│   │   ├── Title Text
│   │   └── Invoice Info (number, amount, client)
│   │
│   ├── DialogContent
│   │   ├── Alert (Info)
│   │   │   └── Multiple jobs message
│   │   │
│   │   ├── TextField (Search)
│   │   │   └── Search Icon
│   │   │
│   │   ├── Typography (Job count)
│   │   │
│   │   ├── RadioGroup
│   │   │   └── Stack (Job cards)
│   │   │       └── Card (for each job)
│   │   │           ├── CardActionArea
│   │   │           └── CardContent
│   │   │               ├── Radio Button
│   │   │               ├── Job Title
│   │   │               ├── Status Chip
│   │   │               ├── Progress Bar
│   │   │               └── Metadata (team, supervisor, date)
│   │   │
│   │   ├── Divider (OR separator)
│   │   │
│   │   └── Card (Create New Job)
│   │       ├── CardActionArea
│   │       └── CardContent
│   │           ├── Add Icon
│   │           └── Text
│   │
│   └── DialogActions
│       ├── Cancel Button
│       └── LoadingButton (Link to Job)
│           └── CheckCircle Icon
```

## State Management

```typescript
// Local State
const [searchQuery, setSearchQuery] = useState('');
const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

// Computed State (useMemo)
const filteredJobs = useMemo(() => {
  // Filter jobs based on search query
}, [matchingJobs, searchQuery]);

// Props (from parent)
- open: boolean
- matchingJobs: JobSummary[]
- invoiceNumber: string
- invoiceAmount: number
- clientName: string
- isLinking: boolean

// Callbacks (to parent)
- onSelectJob(jobId: number)
- onCreateNew()
- onCancel()
```

## Data Flow

```
Parent Component (InvoiceTab)
    │
    │ Invoice Payment Update
    ▼
Backend API (PATCH /invoices/{id}/payment)
    │
    │ Returns: requires_job_selection + matching_jobs
    ▼
Parent Component
    │
    │ Opens Dialog with matching_jobs
    ▼
JobSelectionDialog
    │
    ├─► User searches jobs
    │   └─► filteredJobs updated (local state)
    │
    ├─► User selects job
    │   └─► selectedJobId updated (local state)
    │
    ├─► User clicks "Link to Job"
    │   └─► onSelectJob(jobId) callback
    │       └─► Parent calls linkInvoiceToJob API
    │           └─► Backend links invoice to job
    │
    ├─► User clicks "Create New Job"
    │   └─► onCreateNew() callback
    │       └─► Parent closes dialog
    │           └─► Backend creates new job
    │
    └─► User clicks "Cancel"
        └─► onCancel() callback
            └─► Parent closes dialog
```

## Event Handlers

```typescript
// Internal Handlers
handleJobSelect(jobId: number)
  └─► Updates selectedJobId state

handleConfirmSelection()
  └─► Calls onSelectJob(selectedJobId)

handleCancel()
  └─► Resets state and calls onCancel()

// Search Handler
setSearchQuery(value)
  └─► Triggers filteredJobs recalculation

// Create New Handler
onCreateNew (passed through)
  └─► Handled by parent component
```

## Styling Approach

### Theme Integration
- Uses Material-UI theme colors
- Responsive spacing with `sx` prop
- Consistent with existing app design

### Interactive States
```typescript
// Card Selection
border: selectedJobId === job.id ? 2 : 1
borderColor: selectedJobId === job.id ? 'primary.main' : 'divider'

// Hover Effects
'&:hover': {
  borderColor: 'primary.main',
  boxShadow: 2,
}

// Status Colors
getStatusColor(status) {
  'not_started' → 'default'
  'in_progress' → 'primary'
  'completed' → 'success'
}
```

### Responsive Design
- `maxWidth="md"` for dialog
- `fullWidth` for optimal viewing
- Flexible card layout with Stack
- Mobile-friendly touch targets

## Key Features Implementation

### 1. Search Functionality
```typescript
const filteredJobs = useMemo(() => {
  if (!searchQuery.trim()) return matchingJobs;
  
  const query = searchQuery.toLowerCase();
  return matchingJobs.filter(job =>
    job.title.toLowerCase().includes(query) ||
    job.team_name.toLowerCase().includes(query) ||
    job.supervisor_name.toLowerCase().includes(query) ||
    job.status.toLowerCase().includes(query)
  );
}, [matchingJobs, searchQuery]);
```

### 2. Job Selection
```typescript
<RadioGroup value={selectedJobId}>
  {filteredJobs.map(job => (
    <Card onClick={() => handleJobSelect(job.id)}>
      <FormControlLabel
        value={job.id}
        control={<Radio />}
      />
      {/* Job details */}
    </Card>
  ))}
</RadioGroup>
```

### 3. Progress Visualization
```typescript
<LinearProgress
  variant="determinate"
  value={job.progress}
  sx={{ height: 6, borderRadius: 3 }}
/>
```

### 4. Conditional Rendering
```typescript
{filteredJobs.length === 0 ? (
  <EmptyState />
) : (
  <JobCards />
)}

{selectedJobId ? (
  <LoadingButton />
) : (
  <DisabledButton />
)}
```

## Accessibility Features

- ✅ Semantic HTML structure
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Screen reader friendly text
- ✅ Color contrast compliance
- ✅ Touch-friendly targets (48px minimum)

## Performance Optimizations

1. **Memoization**: `useMemo` for filtered jobs
2. **Debouncing**: Search input (handled by parent if needed)
3. **Lazy Loading**: Dialog content only rendered when open
4. **Efficient Re-renders**: Proper key props on list items
5. **Optimistic Updates**: Immediate UI feedback

## Error Handling

```typescript
// Loading State
isLinking={isLinking}
  └─► Shows loading spinner in button
  └─► Disables cancel button

// Empty State
filteredJobs.length === 0
  └─► Shows "No jobs found" message
  └─► Suggests trying different search

// Network Errors
Handled by parent component
  └─► Shows error toast
  └─► Keeps dialog open for retry
```

## Integration Points

### Required Imports
```typescript
import JobSelectionDialog from '../../components/invoices/JobSelectionDialog';
import { useLinkInvoiceToJobMutation } from '../../store/api/invoicesApi';
```

### Required State
```typescript
const [showJobSelection, setShowJobSelection] = useState(false);
const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);
```

### Required Handlers
```typescript
const handleSelectJob = async (jobId: number) => { /* ... */ };
const handleCreateNewJob = () => { /* ... */ };
const handleCancelJobSelection = () => { /* ... */ };
```

## Testing Scenarios

### Unit Tests
- [ ] Component renders with props
- [ ] Search filters jobs correctly
- [ ] Job selection updates state
- [ ] Callbacks are called with correct arguments
- [ ] Empty state displays correctly

### Integration Tests
- [ ] Dialog opens on requires_job_selection
- [ ] API call succeeds on job selection
- [ ] Error handling works correctly
- [ ] Dialog closes after successful link

### E2E Tests
- [ ] Complete invoice payment flow
- [ ] Job selection and linking
- [ ] Create new job flow
- [ ] Cancel and retry flow
