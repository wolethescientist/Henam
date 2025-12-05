# Quick Reference: Manual Job Creation API

## Endpoints at a Glance

### Job Creation
```bash
POST /jobs/?skip_duplicate_check=false
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Website Redesign",
  "client": "Acme Corp",
  "start_date": "2024-01-15T09:00:00Z",
  "end_date": "2024-03-15T17:00:00Z",
  "team_id": 5,
  "supervisor_id": 12
}
```

### Duplicate Check
```bash
POST /jobs/check-duplicates
Content-Type: application/json

{
  "client_name": "Acme Corp",
  "job_title": "Website Redesign"
}
```

### Get Clients
```bash
GET /jobs/clients
```

### Get Jobs by Client
```bash
GET /jobs/by-client/Acme%20Corp?include_completed=false
```

### Get Audit Log
```bash
GET /jobs/42/audit-log?page=1&limit=50
```

### Link Invoice to Job
```bash
POST /invoices/89/link-to-job
Content-Type: application/json

{
  "job_id": 42
}
```

### Update Invoice Payment
```bash
PATCH /invoices/89/payment
Content-Type: application/json

{
  "paid_amount": 15000.00
}
```

---

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request data |
| 401 | Unauthorized | Check auth token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate detected |
| 500 | Server Error | Retry or contact support |

---

## Key Data Models

### JobResponse
```typescript
{
  id: number;
  title: string;
  client: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  creation_source: "MANUAL" | "AUTO_FROM_INVOICE";
  duplicate_override: boolean;
  duplicate_justification: string | null;
}
```

### DuplicateCheckResult
```typescript
{
  has_duplicates: boolean;
  matching_jobs: JobSummary[];
  is_repeat_project: boolean;
  suggestion: string;
}
```

---

## Common Workflows

### Create Job with Duplicate Check
```javascript
// 1. Check for duplicates
const checkResult = await fetch('/jobs/check-duplicates', {
  method: 'POST',
  body: JSON.stringify({
    client_name: 'Acme Corp',
    job_title: 'Website Redesign'
  })
});

// 2. If duplicates found, show warning to user
if (checkResult.has_duplicates) {
  // Show duplicate warning dialog
  const userDecision = await showDuplicateWarning(checkResult);
  
  if (userDecision === 'create_anyway') {
    // 3. Create with justification
    await fetch('/jobs/?skip_duplicate_check=true&duplicate_justification=' + 
                encodeURIComponent(justification), {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }
} else {
  // 3. Create job normally
  await fetch('/jobs/', {
    method: 'POST',
    body: JSON.stringify(jobData)
  });
}
```

### Handle Invoice Payment
```javascript
// 1. Update payment
const response = await fetch(`/invoices/${invoiceId}/payment`, {
  method: 'PATCH',
  body: JSON.stringify({ paid_amount: amount })
});

const data = await response.json();

// 2. Check if job selection needed
if (data.requires_job_selection) {
  // Show job selection dialog
  const selectedJobId = await showJobSelectionDialog(data.matching_jobs);
  
  // 3. Link to selected job
  await fetch(`/invoices/${invoiceId}/link-to-job`, {
    method: 'POST',
    body: JSON.stringify({ job_id: selectedJobId })
  });
}
```

---

## Error Handling

```javascript
try {
  const response = await fetch('/jobs/', {
    method: 'POST',
    body: JSON.stringify(jobData)
  });
  
  if (!response.ok) {
    if (response.status === 409) {
      // Duplicate detected
      const context = response.headers.get('X-Duplicate-Context');
      handleDuplicateWarning(JSON.parse(context));
    } else if (response.status === 400) {
      // Validation error
      const error = await response.json();
      showValidationError(error.detail);
    } else {
      throw new Error('Job creation failed');
    }
  }
  
  const job = await response.json();
  return job;
  
} catch (error) {
  console.error('Error creating job:', error);
  showErrorToast('Failed to create job');
}
```

---

## Environment Variables

```bash
# API Base URL
VITE_API_BASE_URL=https://api.example.com

# Authentication
VITE_AUTH_TOKEN_KEY=auth_token

# Feature Flags
VITE_ENABLE_DUPLICATE_CHECK=true
VITE_ENABLE_SMART_LINKING=true
```

---

## Testing

### Unit Test Example
```javascript
describe('Job Creation', () => {
  it('should check for duplicates before creating', async () => {
    const mockDuplicateCheck = jest.fn().mockResolvedValue({
      has_duplicates: false,
      matching_jobs: []
    });
    
    await createJob(jobData, mockDuplicateCheck);
    
    expect(mockDuplicateCheck).toHaveBeenCalledWith(
      jobData.client,
      jobData.title
    );
  });
});
```

### Integration Test Example
```bash
# Test duplicate detection
curl -X POST http://localhost:8000/jobs/check-duplicates \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Test Client", "job_title": "Test Job"}'

# Test job creation
curl -X POST http://localhost:8000/jobs/ \
  -H "Authorization: Bearer test_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Job",
    "client": "Test Client",
    "start_date": "2024-01-15T09:00:00Z",
    "team_id": 1,
    "supervisor_id": 1
  }'
```

---

## Debugging

### Enable Debug Logging
```python
# Backend
import logging
logging.getLogger('app.services.job_creation_service').setLevel(logging.DEBUG)
```

```javascript
// Frontend
localStorage.setItem('debug', 'job-creation:*');
```

### Common Debug Points
- Duplicate detection query performance
- Invoice matching logic
- Audit log creation
- Cache invalidation

### Useful Log Searches
```bash
# Job creation events
grep "Job creation request" app.log

# Duplicate warnings
grep "Duplicate jobs detected" app.log

# Invoice linking
grep "Invoice.*linked to job" app.log
```

---

## Performance Tips

1. **Cache client list**: 5 minute TTL
2. **Batch duplicate checks**: Check multiple jobs at once
3. **Optimize queries**: Use indexes on client and title
4. **Lazy load audit logs**: Paginate with limit=50
5. **Debounce autocomplete**: Wait 300ms before searching

---

## Security Checklist

- [ ] Validate all input data
- [ ] Sanitize client names and titles
- [ ] Check user permissions before job creation
- [ ] Log all duplicate override decisions
- [ ] Rate limit duplicate check endpoint
- [ ] Validate invoice ownership before linking
- [ ] Audit all job modifications

---

## Useful SQL Queries

### Find duplicate jobs
```sql
SELECT client, title, COUNT(*) as count
FROM jobs
WHERE status IN ('NOT_STARTED', 'IN_PROGRESS')
GROUP BY client, title
HAVING COUNT(*) > 1;
```

### Jobs by creation source
```sql
SELECT creation_source, COUNT(*) as count
FROM jobs
GROUP BY creation_source;
```

### Duplicate override rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE duplicate_override = true) * 100.0 / COUNT(*) as override_rate
FROM jobs
WHERE creation_source = 'MANUAL';
```

---

## Support Resources

- **Full API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **User Guide**: [USER_GUIDE.md](./USER_GUIDE.md)
- **Design Doc**: [design.md](./design.md)
- **Requirements**: [requirements.md](./requirements.md)

---

**Version**: 1.0.0  
**Last Updated**: January 10, 2024
