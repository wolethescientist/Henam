# Design Document: Manual Job Creation with Duplicate Prevention

## Overview

This design implements manual job creation functionality while preventing duplicate jobs through intelligent detection and smart invoice-to-job linking. The solution maintains backward compatibility with the existing automatic job creation from paid invoices while adding a new manual creation path.

### Key Design Principles

1. **Non-Breaking Changes**: Existing invoice-to-job conversion continues to work
2. **User Control**: System warns but doesn't block - users make final decisions
3. **Performance First**: Duplicate detection must be fast (<500ms)
4. **Audit Everything**: Complete trail of all creation and linking decisions
5. **Smart Defaults**: System suggests best actions based on existing data

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Job Creation Entry Points                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Manual Creation          2. Invoice Payment              │
│     (Jobs Page)                  (Invoices Page)             │
│         │                             │                      │
│         ▼                             ▼                      │
│   ┌──────────┐                 ┌──────────┐                 │
│   │ Duplicate│                 │  Smart   │                 │
│   │ Detection│                 │ Linking  │                 │
│   └────┬─────┘                 └────┬─────┘                 │
│        │                            │                        │
│        ├─ No Match ────────────────►│                        │
│        │                            │                        │
│        ├─ Match Found              │                        │
│        │   (Warn User)              │                        │
│        │                            │                        │
│        └─ User Decides ────────────►│                        │
│                                     │                        │
│                                     ▼                        │
│                            ┌─────────────────┐               │
│                            │  Create/Link    │               │
│                            │  Job Record     │               │
│                            └─────────────────┘               │
│                                     │                        │
│                                     ▼                        │
│                            ┌─────────────────┐               │
│                            │  Notifications  │               │
│                            │  & Audit Log    │               │
│                            └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Backend Components

#### 1.1 Job Duplicate Detection Service

**Location**: `app/services/job_duplicate_service.py`

**Purpose**: Detect potential duplicate jobs before creation

**Interface**:
```python
class JobDuplicateService:
    def check_for_duplicates(
        self,
        client_name: str,
        job_title: str,
        db: Session
    ) -> DuplicateCheckResult:
        """
        Check for existing jobs with same client and similar title.
        Only checks jobs with status NOT_STARTED or IN_PROGRESS.
        """
        pass
    
    def find_matching_jobs_for_invoice(
        self,
        client_name: str,
        db: Session
    ) -> List[Job]:
        """
        Find active jobs matching invoice client for smart linking.
        Returns jobs with status NOT_STARTED or IN_PROGRESS only.
        """
        pass
    
    def calculate_title_similarity(
        self,
        title1: str,
        title2: str
    ) -> float:
        """
        Calculate similarity score between two job titles (0.0 to 1.0).
        Uses fuzzy matching for better detection.
        """
        pass
```

**Data Structures**:
```python
class DuplicateCheckResult(BaseModel):
    has_duplicates: bool
    matching_jobs: List[JobSummary]
    is_repeat_project: bool  # True if completed jobs exist with same title
    previous_job: Optional[JobSummary]  # Most recent completed job for copying settings

class JobSummary(BaseModel):
    id: int
    title: str
    client: str
    status: JobStatus
    progress: float
    team_name: str
    supervisor_name: str
    start_date: datetime
    created_at: datetime
```

#### 1.2 Job Creation Service

**Location**: `app/services/job_creation_service.py`

**Purpose**: Centralized job creation logic with source tracking

**Interface**:
```python
class JobCreationService:
    def create_job_manual(
        self,
        job_data: JobCreate,
        current_user: User,
        db: Session,
        skip_duplicate_check: bool = False,
        duplicate_justification: Optional[str] = None
    ) -> Job:
        """
        Create job manually from Jobs page.
        Performs duplicate check unless explicitly skipped.
        """
        pass
    
    def create_job_from_invoice(
        self,
        invoice: Invoice,
        db: Session
    ) -> Job:
        """
        Create job automatically from paid invoice.
        Uses smart linking to avoid duplicates.
        """
        pass
    
    def link_invoice_to_job(
        self,
        invoice: Invoice,
        job: Job,
        db: Session
    ) -> None:
        """
        Link an invoice to an existing job.
        Updates job financial summary.
        """
        pass
```

#### 1.3 Job Audit Service

**Location**: `app/services/job_audit_service.py`

**Purpose**: Track all job creation and modification decisions

**Interface**:
```python
class JobAuditService:
    def log_job_creation(
        self,
        job: Job,
        source: JobCreationSource,
        user_id: int,
        originating_invoice_id: Optional[int],
        db: Session
    ) -> None:
        """Log job creation event"""
        pass
    
    def log_duplicate_decision(
        self,
        job_data: dict,
        duplicate_jobs: List[Job],
        user_decision: str,  # "create_anyway", "view_existing", "cancel"
        justification: Optional[str],
        user_id: int,
        db: Session
    ) -> None:
        """Log user's decision when duplicate detected"""
        pass
    
    def log_invoice_linking(
        self,
        invoice: Invoice,
        job: Job,
        user_id: int,
        db: Session
    ) -> None:
        """Log invoice-to-job linking event"""
        pass
```

### 2. Database Schema Changes

#### 2.1 Jobs Table Modifications

```python
# Add to Job model in app/models.py

class JobCreationSource(str, enum.Enum):
    MANUAL = "MANUAL"
    AUTO_FROM_INVOICE = "AUTO_FROM_INVOICE"

class Job(Base):
    # ... existing fields ...
    
    # New fields for tracking
    creation_source = Column(
        SQLEnum(JobCreationSource),
        default=JobCreationSource.MANUAL,
        nullable=False,
        index=True
    )
    originating_invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=True,
        index=True
    )
    duplicate_override = Column(
        Boolean,
        default=False,
        index=True
    )  # True if created despite duplicate warning
    duplicate_justification = Column(
        Text,
        nullable=True
    )  # User's reason for creating duplicate
    
    # Relationships
    originating_invoice = relationship(
        "Invoice",
        foreign_keys=[originating_invoice_id],
        backref="created_job"
    )
```

#### 2.2 Job Audit Log Table

```python
# New table in app/models.py

class JobAuditEventType(str, enum.Enum):
    JOB_CREATED = "JOB_CREATED"
    DUPLICATE_WARNING_SHOWN = "DUPLICATE_WARNING_SHOWN"
    DUPLICATE_OVERRIDE = "DUPLICATE_OVERRIDE"
    INVOICE_LINKED = "INVOICE_LINKED"
    JOB_UPDATED = "JOB_UPDATED"
    JOB_MERGED = "JOB_MERGED"

class JobAuditLog(Base):
    __tablename__ = "job_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    event_type = Column(SQLEnum(JobAuditEventType), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_data = Column(JSON, nullable=True)  # Flexible storage for event details
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    job = relationship("Job", backref="audit_logs")
    user = relationship("User", backref="job_audit_logs")
    
    # Indexes
    __table_args__ = (
        Index('ix_job_audit_logs_job_timestamp', 'job_id', 'timestamp'),
        Index('ix_job_audit_logs_user_timestamp', 'user_id', 'timestamp'),
    )
```

#### 2.3 Database Indexes for Performance

```sql
-- Indexes for duplicate detection (fast client + title lookup)
CREATE INDEX ix_jobs_client_lower ON jobs (LOWER(client));
CREATE INDEX ix_jobs_title_lower ON jobs (LOWER(title));
CREATE INDEX ix_jobs_client_title_status ON jobs (client, title, status);

-- Indexes for smart invoice linking
CREATE INDEX ix_jobs_client_status ON jobs (client, status);
CREATE INDEX ix_invoices_client_lower ON invoices (LOWER(client_name));
```

### 3. API Endpoints

#### 3.1 New Endpoints

```python
# In app/routers/jobs.py

@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
def check_job_duplicates(
    check_data: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check for duplicate jobs before creation.
    Returns matching jobs and repeat project info.
    """
    pass

@router.get("/by-client/{client_name}", response_model=List[JobResponse])
def get_jobs_by_client(
    client_name: str,
    include_completed: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all jobs for a specific client.
    Used for client grouping view.
    """
    pass

@router.get("/clients", response_model=List[ClientSummary])
def get_all_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of all unique clients with job counts.
    Used for client autocomplete and grouping.
    """
    pass

@router.get("/{job_id}/audit-log", response_model=List[AuditLogEntry])
def get_job_audit_log(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete audit trail for a job.
    """
    pass
```

#### 3.2 Modified Endpoints

```python
# Update existing create_job endpoint

@router.post("/", response_model=JobResponse)
def create_job(
    job_data: JobCreate,
    skip_duplicate_check: bool = False,
    duplicate_justification: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new job manually.
    
    Parameters:
    - skip_duplicate_check: Set to True to bypass duplicate warning
    - duplicate_justification: Required if skip_duplicate_check is True
    """
    # Use JobCreationService instead of direct creation
    pass
```

### 4. Frontend Components

#### 4.1 Job Creation Modal

**Location**: `henam-frontend/src/components/jobs/CreateJobModal.tsx`

**Features**:
- Form for manual job creation
- Client name autocomplete from existing clients
- Team and supervisor selection
- Date pickers with validation
- Duplicate warning integration

**State Management**:
```typescript
interface CreateJobModalState {
  formData: CreateJobForm;
  isCheckingDuplicates: boolean;
  duplicateCheckResult: DuplicateCheckResult | null;
  showDuplicateWarning: boolean;
  selectedExistingJob: Job | null;
}
```

#### 4.2 Duplicate Warning Dialog

**Location**: `henam-frontend/src/components/jobs/DuplicateWarningDialog.tsx`

**Features**:
- Side-by-side comparison of new vs existing job
- Highlight differences
- Show existing job status and progress
- Action buttons: "View Existing", "Create Anyway", "Cancel"
- Optional justification text field for "Create Anyway"

**Props**:
```typescript
interface DuplicateWarningDialogProps {
  open: boolean;
  newJobData: CreateJobForm;
  matchingJobs: JobSummary[];
  isRepeatProject: boolean;
  previousJob?: JobSummary;
  onViewExisting: (jobId: number) => void;
  onCreateAnyway: (justification: string) => void;
  onCancel: () => void;
}
```

#### 4.3 Invoice Job Selection Dialog

**Location**: `henam-frontend/src/components/invoices/JobSelectionDialog.tsx`

**Purpose**: When invoice is paid and multiple active jobs exist for client

**Features**:
- List of matching active jobs
- Job details preview
- Option to create new job instead
- Search/filter jobs

#### 4.4 Client Grouping View

**Location**: `henam-frontend/src/components/jobs/ClientGroupedView.tsx`

**Features**:
- Accordion-style client groups
- Client summary (job count, total billed, total paid)
- Expandable to show all jobs for client
- Quick actions per client

## Data Models

### Request/Response Schemas

```python
# In app/schemas.py

class DuplicateCheckRequest(BaseModel):
    client_name: str
    job_title: str

class DuplicateCheckResponse(BaseModel):
    has_duplicates: bool
    matching_jobs: List[JobSummary]
    is_repeat_project: bool
    previous_job: Optional[JobSummary]
    suggestion: str  # Human-readable suggestion

class JobCreateExtended(JobCreate):
    skip_duplicate_check: bool = False
    duplicate_justification: Optional[str] = None

class ClientSummary(BaseModel):
    client_name: str
    total_jobs: int
    active_jobs: int
    completed_jobs: int
    total_billed: float
    total_paid: float
    total_pending: float
    last_job_date: datetime

class AuditLogEntry(BaseModel):
    id: int
    event_type: str
    user_name: str
    timestamp: datetime
    event_data: dict
    description: str  # Human-readable description
```

## Error Handling

### Error Scenarios

1. **Duplicate Detection Timeout**
   - Fallback: Allow creation without check
   - Log warning
   - Notify admin

2. **Invoice Linking Failure**
   - Rollback job creation
   - Keep invoice in pending state
   - Retry mechanism

3. **Concurrent Job Creation**
   - Database-level unique constraint on (client, title, status) for active jobs
   - Handle constraint violation gracefully
   - Show user-friendly message

### Error Response Format

```python
class DuplicateDetectionError(BaseException):
    """Raised when duplicate detection fails"""
    pass

class InvoiceLinkingError(BaseException):
    """Raised when invoice-to-job linking fails"""
    pass
```

## Testing Strategy

### Unit Tests

1. **Duplicate Detection Logic**
   - Test exact matches
   - Test fuzzy matches
   - Test case-insensitive matching
   - Test with completed jobs (should not trigger warning)
   - Test with active jobs (should trigger warning)

2. **Smart Invoice Linking**
   - Test single match scenario
   - Test multiple matches scenario
   - Test no match scenario
   - Test with completed jobs only

3. **Job Creation Service**
   - Test manual creation path
   - Test auto-creation from invoice
   - Test duplicate override
   - Test audit logging

### Integration Tests

1. **End-to-End Job Creation**
   - Create job manually → verify in database
   - Create job with duplicate → verify warning shown
   - Override duplicate → verify justification logged

2. **Invoice-to-Job Flow**
   - Pay invoice with no existing job → verify new job created
   - Pay invoice with one existing job → verify linked
   - Pay invoice with multiple existing jobs → verify selection dialog

3. **Audit Trail**
   - Verify all events logged correctly
   - Verify audit log retrieval

### Performance Tests

1. **Duplicate Detection Speed**
   - Test with 1,000 jobs
   - Test with 10,000 jobs
   - Verify <500ms response time

2. **Concurrent Creation**
   - Simulate 10 simultaneous job creations
   - Verify no duplicates created
   - Verify all requests handled correctly

## Performance Optimization

### Database Query Optimization

1. **Duplicate Detection Query**
```sql
-- Optimized query using indexes
SELECT j.* FROM jobs j
WHERE LOWER(j.client) = LOWER(:client_name)
  AND j.status IN ('NOT_STARTED', 'IN_PROGRESS')
  AND similarity(LOWER(j.title), LOWER(:job_title)) > 0.7
ORDER BY j.created_at DESC
LIMIT 10;
```

2. **Client Lookup Query**
```sql
-- Fast client autocomplete
SELECT DISTINCT client, COUNT(*) as job_count
FROM jobs
WHERE LOWER(client) LIKE LOWER(:search_term || '%')
GROUP BY client
ORDER BY job_count DESC, client ASC
LIMIT 20;
```

### Caching Strategy

1. **Client List Cache**
   - Cache for 5 minutes
   - Invalidate on new job creation

2. **Duplicate Check Cache**
   - Cache negative results (no duplicates) for 1 minute
   - Never cache positive results (always check fresh)

3. **Audit Log Cache**
   - Cache per job for 2 minutes
   - Invalidate on new audit events

## Security Considerations

1. **Authorization**
   - Only authenticated users can create jobs
   - Audit log shows who created/modified what
   - Cannot modify other users' justifications

2. **Input Validation**
   - Sanitize client names and job titles
   - Validate date ranges
   - Prevent SQL injection in search queries

3. **Rate Limiting**
   - Limit duplicate checks to 10 per minute per user
   - Limit job creation to 20 per hour per user

## Migration Strategy

### Phase 1: Database Changes
1. Add new columns to jobs table
2. Create job_audit_logs table
3. Add database indexes
4. Backfill creation_source for existing jobs (set to AUTO_FROM_INVOICE)

### Phase 2: Backend Services
1. Implement JobDuplicateService
2. Implement JobCreationService
3. Implement JobAuditService
4. Update existing create_job endpoint
5. Add new API endpoints

### Phase 3: Frontend Components
1. Create CreateJobModal
2. Create DuplicateWarningDialog
3. Create JobSelectionDialog
4. Update Jobs page to include "Create Job" button
5. Add client grouping view

### Phase 4: Invoice Integration
1. Update invoice payment flow to use smart linking
2. Add job selection dialog for multiple matches
3. Update notifications

### Phase 5: Testing & Rollout
1. Run all tests
2. Deploy to staging
3. User acceptance testing
4. Deploy to production
5. Monitor for issues

## Rollback Plan

If issues arise:
1. Disable "Create Job" button in frontend
2. Revert to auto-creation only from invoices
3. Keep audit logs for analysis
4. Fix issues and redeploy

## Monitoring & Metrics

### Key Metrics to Track

1. **Job Creation Metrics**
   - Manual vs auto-created jobs ratio
   - Duplicate warnings shown per day
   - Duplicate overrides per day
   - Average time to create job

2. **Performance Metrics**
   - Duplicate check response time (p50, p95, p99)
   - Job creation API response time
   - Database query performance

3. **User Behavior Metrics**
   - How often users choose "Create Anyway"
   - How often users choose "View Existing"
   - Most common duplicate scenarios

4. **Error Metrics**
   - Duplicate detection failures
   - Invoice linking failures
   - Concurrent creation conflicts

### Alerts

1. **Performance Alerts**
   - Duplicate check >1 second
   - Job creation API >2 seconds

2. **Error Alerts**
   - Duplicate detection failure rate >5%
   - Invoice linking failure rate >2%

3. **Business Alerts**
   - Duplicate override rate >20% (may indicate poor detection)
   - Multiple active jobs for same client >10 (may indicate data quality issue)

## Future Enhancements

1. **Machine Learning for Duplicate Detection**
   - Train model on historical duplicate decisions
   - Improve fuzzy matching accuracy

2. **Bulk Job Creation**
   - Import jobs from CSV/Excel
   - Batch duplicate checking

3. **Job Templates**
   - Save common job configurations
   - Quick create from template

4. **Advanced Client Management**
   - Client profiles with contact info
   - Client-specific settings
   - Client relationship tracking

5. **Job Merging**
   - Merge duplicate jobs created by mistake
   - Combine invoices and history
