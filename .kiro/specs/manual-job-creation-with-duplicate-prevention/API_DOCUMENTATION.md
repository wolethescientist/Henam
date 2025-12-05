# API Documentation: Manual Job Creation with Duplicate Prevention

## Overview

This document provides comprehensive API documentation for the Manual Job Creation with Duplicate Prevention feature. All endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `/api` (adjust based on your deployment)

**Authentication**: All endpoints require Bearer token authentication via the `Authorization` header.

```
Authorization: Bearer <your_access_token>
```

---

## Table of Contents

1. [Job Creation Endpoints](#job-creation-endpoints)
2. [Duplicate Detection Endpoints](#duplicate-detection-endpoints)
3. [Client Management Endpoints](#client-management-endpoints)
4. [Audit Log Endpoints](#audit-log-endpoints)
5. [Invoice Linking Endpoints](#invoice-linking-endpoints)
6. [Error Codes](#error-codes)
7. [Data Models](#data-models)

---

## Job Creation Endpoints

### Create Job (Manual)

Create a new job manually from the Jobs page with optional duplicate checking.

**Endpoint**: `POST /jobs/`

**Query Parameters**:
- `skip_duplicate_check` (boolean, optional): Set to `true` to bypass duplicate warning. Default: `false`
- `duplicate_justification` (string, optional): Required if `skip_duplicate_check` is `true`. Explanation for creating despite duplicates.

**Request Body**:
```json
{
  "title": "Website Redesign",
  "client": "Acme Corporation",
  "start_date": "2024-01-15T09:00:00Z",
  "end_date": "2024-03-15T17:00:00Z",
  "team_id": 5,
  "supervisor_id": 12,
  "assigner_id": 1
}
```

**Success Response** (201 Created):
```json
{
  "id": 42,
  "title": "Website Redesign",
  "client": "Acme Corporation",
  "start_date": "2024-01-15T09:00:00Z",
  "end_date": "2024-03-15T17:00:00Z",
  "progress": 0.0,
  "status": "NOT_STARTED",
  "days_on_job": 0,
  "team_id": 5,
  "supervisor_id": 12,
  "assigner_id": 1,
  "creation_source": "MANUAL",
  "originating_invoice_id": null,
  "duplicate_override": false,
  "duplicate_justification": null,
  "created_at": "2024-01-10T14:30:00Z",
  "updated_at": null,
  "team": {
    "id": 5,
    "name": "Development Team",
    "supervisor_id": 12
  },
  "supervisor": {
    "id": 12,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "assigner": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

**Error Responses**:

**400 Bad Request** - Validation Error:
```json
{
  "detail": "Justification is required when creating a job despite duplicate warning"
}
```

**404 Not Found** - Team or Supervisor Not Found:
```json
{
  "detail": "Team not found"
}
```

**409 Conflict** - Duplicate Jobs Found:
```json
{
  "detail": "Duplicate jobs found for this client and title",
  "headers": {
    "X-Duplicate-Context": "{\"matching_jobs\": [23, 45], \"is_repeat_project\": false}"
  }
}
```

**Example with Duplicate Override**:
```bash
POST /jobs/?skip_duplicate_check=true&duplicate_justification=Client%20requested%20separate%20project
```

---

## Duplicate Detection Endpoints

### Check for Duplicate Jobs

Check if similar jobs exist before creating a new one.

**Endpoint**: `POST /jobs/check-duplicates`

**Request Body**:
```json
{
  "client_name": "Acme Corporation",
  "job_title": "Website Redesign"
}
```

**Success Response** (200 OK):
```json
{
  "has_duplicates": true,
  "matching_jobs": [
    {
      "id": 23,
      "title": "Website Redesign",
      "client": "Acme Corporation",
      "status": "IN_PROGRESS",
      "progress": 45.0,
      "team_name": "Development Team",
      "supervisor_name": "John Doe",
      "start_date": "2023-12-01T09:00:00Z",
      "created_at": "2023-11-28T10:00:00Z"
    }
  ],
  "is_repeat_project": false,
  "previous_job": null,
  "suggestion": "A similar job is already in progress. Consider linking invoices to the existing job instead of creating a new one."
}
```

**Response with Repeat Project**:
```json
{
  "has_duplicates": false,
  "matching_jobs": [],
  "is_repeat_project": true,
  "previous_job": {
    "id": 15,
    "title": "Website Redesign",
    "client": "Acme Corporation",
    "status": "COMPLETED",
    "progress": 100.0,
    "team_name": "Development Team",
    "supervisor_name": "John Doe",
    "start_date": "2023-06-01T09:00:00Z",
    "created_at": "2023-05-25T10:00:00Z"
  },
  "suggestion": "This appears to be a repeat project. Consider copying settings from the previous completed job and appending a sequence number to the title."
}
```

**Error Responses**:

**400 Bad Request**:
```json
{
  "detail": "client_name and job_title are required"
}
```

---

## Client Management Endpoints

### Get All Clients

Retrieve a list of all unique clients with summary statistics.

**Endpoint**: `GET /jobs/clients`

**Query Parameters**: None

**Success Response** (200 OK):
```json
[
  {
    "client_name": "Acme Corporation",
    "total_jobs": 12,
    "active_jobs": 3,
    "completed_jobs": 9,
    "total_billed": 125000.00,
    "total_paid": 98000.00,
    "total_pending": 27000.00,
    "last_job_date": "2024-01-15T09:00:00Z"
  },
  {
    "client_name": "TechStart Inc",
    "total_jobs": 5,
    "active_jobs": 1,
    "completed_jobs": 4,
    "total_billed": 45000.00,
    "total_paid": 45000.00,
    "total_pending": 0.00,
    "last_job_date": "2023-12-20T09:00:00Z"
  }
]
```

**Use Cases**:
- Client autocomplete in job creation form
- Client grouped view
- Financial reporting by client

---

### Get Jobs by Client

Retrieve all jobs for a specific client.

**Endpoint**: `GET /jobs/by-client/{client_name}`

**Path Parameters**:
- `client_name` (string, required): The client name (URL encoded)

**Query Parameters**:
- `include_completed` (boolean, optional): Include completed jobs. Default: `false`
- `page` (integer, optional): Page number for pagination. Default: `1`
- `limit` (integer, optional): Items per page. Default: `20`

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 42,
      "title": "Website Redesign",
      "client": "Acme Corporation",
      "start_date": "2024-01-15T09:00:00Z",
      "end_date": "2024-03-15T17:00:00Z",
      "progress": 0.0,
      "status": "NOT_STARTED",
      "days_on_job": 0,
      "team_id": 5,
      "supervisor_id": 12,
      "creation_source": "MANUAL",
      "team": {
        "id": 5,
        "name": "Development Team"
      },
      "supervisor": {
        "id": 12,
        "name": "John Doe"
      }
    }
  ],
  "total_count": 12,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "detail": "No jobs found for client: Acme Corporation"
}
```

**Example Request**:
```bash
GET /jobs/by-client/Acme%20Corporation?include_completed=true&page=1&limit=10
```

---

## Audit Log Endpoints

### Get Job Audit Log

Retrieve the complete audit trail for a specific job.

**Endpoint**: `GET /jobs/{job_id}/audit-log`

**Path Parameters**:
- `job_id` (integer, required): The job ID

**Query Parameters**:
- `page` (integer, optional): Page number for pagination. Default: `1`
- `limit` (integer, optional): Items per page. Default: `50`
- `event_type` (string, optional): Filter by event type. Options: `JOB_CREATED`, `DUPLICATE_WARNING_SHOWN`, `DUPLICATE_OVERRIDE`, `INVOICE_LINKED`, `JOB_UPDATED`, `JOB_MERGED`

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 156,
      "event_type": "JOB_CREATED",
      "user_name": "Admin User",
      "timestamp": "2024-01-10T14:30:00Z",
      "event_data": {
        "creation_source": "MANUAL",
        "title": "Website Redesign",
        "client": "Acme Corporation",
        "team_id": 5,
        "supervisor_id": 12
      },
      "description": "Job created manually by Admin User"
    },
    {
      "id": 157,
      "event_type": "DUPLICATE_WARNING_SHOWN",
      "user_name": "Admin User",
      "timestamp": "2024-01-10T14:29:45Z",
      "event_data": {
        "matching_jobs": [23],
        "user_decision": "create_anyway",
        "justification": "Client requested separate project for new department"
      },
      "description": "Duplicate warning shown for 1 matching job(s). User chose to create anyway."
    },
    {
      "id": 158,
      "event_type": "INVOICE_LINKED",
      "user_name": "Finance Manager",
      "timestamp": "2024-01-12T10:15:00Z",
      "event_data": {
        "invoice_id": 89,
        "invoice_number": "INV-2024-0089",
        "amount": 15000.00
      },
      "description": "Invoice INV-2024-0089 ($15,000.00) linked to job"
    }
  ],
  "total_count": 3,
  "page": 1,
  "limit": 50,
  "total_pages": 1
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "detail": "Job not found"
}
```

**Example with Filtering**:
```bash
GET /jobs/42/audit-log?event_type=INVOICE_LINKED&page=1&limit=20
```

---

## Invoice Linking Endpoints

### Link Invoice to Existing Job

Manually link an invoice to an existing job (used when multiple matching jobs are found).

**Endpoint**: `POST /invoices/{invoice_id}/link-to-job`

**Path Parameters**:
- `invoice_id` (integer, required): The invoice ID

**Request Body**:
```json
{
  "job_id": 42
}
```

**Success Response** (200 OK):
```json
{
  "message": "Invoice successfully linked to job",
  "invoice_id": 89,
  "job_id": 42,
  "invoice_number": "INV-2024-0089",
  "job_title": "Website Redesign"
}
```

**Error Responses**:

**404 Not Found** - Invoice Not Found:
```json
{
  "detail": "Invoice not found"
}
```

**404 Not Found** - Job Not Found:
```json
{
  "detail": "Job not found"
}
```

**409 Conflict** - Invoice Already Linked:
```json
{
  "detail": "Invoice is already linked to a job"
}
```

**400 Bad Request** - Job Not Active:
```json
{
  "detail": "Can only link invoices to active jobs (NOT_STARTED or IN_PROGRESS)"
}
```

---

### Update Invoice Payment (with Smart Linking)

Update payment amount for an invoice. Automatically triggers smart linking to find matching jobs.

**Endpoint**: `PATCH /invoices/{invoice_id}/payment`

**Path Parameters**:
- `invoice_id` (integer, required): The invoice ID

**Request Body**:
```json
{
  "paid_amount": 15000.00
}
```

**Success Response - Single Match Found** (200 OK):
```json
{
  "id": 89,
  "invoice_number": "INV-2024-0089",
  "client_name": "Acme Corporation",
  "amount": 15000.00,
  "paid_amount": 15000.00,
  "pending_amount": 0.00,
  "status": "PAID",
  "converted_to_job": true,
  "converted_job_id": 42,
  "job": {
    "id": 42,
    "title": "Website Redesign",
    "client": "Acme Corporation",
    "status": "IN_PROGRESS"
  }
}
```

**Success Response - Multiple Matches Found** (200 OK):
```json
{
  "id": 89,
  "invoice_number": "INV-2024-0089",
  "client_name": "Acme Corporation",
  "amount": 15000.00,
  "paid_amount": 15000.00,
  "pending_amount": 0.00,
  "status": "PAID",
  "converted_to_job": false,
  "converted_job_id": null,
  "requires_job_selection": true,
  "matching_jobs": [
    {
      "id": 42,
      "title": "Website Redesign - Phase 1",
      "client": "Acme Corporation",
      "status": "IN_PROGRESS",
      "progress": 45.0,
      "team_name": "Development Team",
      "supervisor_name": "John Doe",
      "start_date": "2024-01-15T09:00:00Z"
    },
    {
      "id": 56,
      "title": "Website Redesign - Phase 2",
      "client": "Acme Corporation",
      "status": "NOT_STARTED",
      "progress": 0.0,
      "team_name": "Development Team",
      "supervisor_name": "John Doe",
      "start_date": "2024-03-01T09:00:00Z"
    }
  ]
}
```

**Success Response - No Match, New Job Created** (200 OK):
```json
{
  "id": 89,
  "invoice_number": "INV-2024-0089",
  "client_name": "Acme Corporation",
  "amount": 15000.00,
  "paid_amount": 15000.00,
  "pending_amount": 0.00,
  "status": "PAID",
  "converted_to_job": true,
  "converted_job_id": 78,
  "job": {
    "id": 78,
    "title": "Acme Corporation - Project",
    "client": "Acme Corporation",
    "status": "NOT_STARTED",
    "creation_source": "AUTO_FROM_INVOICE",
    "originating_invoice_id": 89
  }
}
```

**Error Responses**:

**400 Bad Request** - Invalid Payment Amount:
```json
{
  "detail": "Payment amount cannot be negative"
}
```

**400 Bad Request** - Payment Exceeds Total:
```json
{
  "detail": "Payment amount cannot exceed invoice total"
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have permission for this action |
| 404 | Not Found | Requested resource doesn't exist |
| 409 | Conflict | Duplicate resource or business logic conflict |
| 500 | Internal Server Error | Unexpected server error |

### Custom Error Headers

**X-Duplicate-Context**: Included in 409 Conflict responses for duplicate detection. Contains JSON with additional context about matching jobs.

---

## Data Models

### JobResponse

```typescript
{
  id: number;
  title: string;
  client: string;
  start_date: string; // ISO 8601 datetime
  end_date: string | null; // ISO 8601 datetime
  progress: number; // 0-100
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  days_on_job: number;
  team_id: number;
  supervisor_id: number;
  assigner_id: number;
  creation_source: "MANUAL" | "AUTO_FROM_INVOICE";
  originating_invoice_id: number | null;
  duplicate_override: boolean;
  duplicate_justification: string | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string | null; // ISO 8601 datetime
  team: TeamResponse;
  supervisor: UserResponse;
  assigner: UserResponse;
}
```

### DuplicateCheckResult

```typescript
{
  has_duplicates: boolean;
  matching_jobs: JobSummary[];
  is_repeat_project: boolean;
  previous_job: JobSummary | null;
  suggestion: string;
}
```

### JobSummary

```typescript
{
  id: number;
  title: string;
  client: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  progress: number;
  team_name: string;
  supervisor_name: string;
  start_date: string; // ISO 8601 datetime
  created_at: string; // ISO 8601 datetime
}
```

### ClientSummary

```typescript
{
  client_name: string;
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_billed: number;
  total_paid: number;
  total_pending: number;
  last_job_date: string | null; // ISO 8601 datetime
}
```

### AuditLogEntry

```typescript
{
  id: number;
  event_type: "JOB_CREATED" | "DUPLICATE_WARNING_SHOWN" | "DUPLICATE_OVERRIDE" | 
              "INVOICE_LINKED" | "JOB_UPDATED" | "JOB_MERGED";
  user_name: string;
  timestamp: string; // ISO 8601 datetime
  event_data: Record<string, any>;
  description: string;
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Duplicate Check**: 10 requests per minute per user
- **Job Creation**: 20 requests per hour per user
- **Other Endpoints**: 100 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704902400
```

---

## Caching

Certain endpoints use caching for performance:
- **GET /jobs/clients**: 5 minute TTL
- **GET /jobs/by-client/{client_name}**: 3 minute TTL
- **GET /jobs/{job_id}/audit-log**: 2 minute TTL

Cache is automatically invalidated when:
- New job is created
- Job is updated
- Invoice is linked to job

---

## Pagination

Paginated endpoints return the following structure:

```json
{
  "items": [...],
  "total_count": 150,
  "page": 1,
  "limit": 20,
  "total_pages": 8
}
```

**Query Parameters**:
- `page`: Page number (1-indexed)
- `limit`: Items per page (max: 100)

---

## Examples

### Complete Job Creation Flow

```bash
# Step 1: Check for duplicates
curl -X POST https://api.example.com/jobs/check-duplicates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Acme Corporation",
    "job_title": "Website Redesign"
  }'

# Step 2: If duplicates found, create with justification
curl -X POST "https://api.example.com/jobs/?skip_duplicate_check=true&duplicate_justification=Client%20requested%20separate%20project" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign",
    "client": "Acme Corporation",
    "start_date": "2024-01-15T09:00:00Z",
    "end_date": "2024-03-15T17:00:00Z",
    "team_id": 5,
    "supervisor_id": 12,
    "assigner_id": 1
  }'

# Step 3: View audit log
curl -X GET https://api.example.com/jobs/42/audit-log \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Invoice Payment with Smart Linking

```bash
# Update invoice payment
curl -X PATCH https://api.example.com/invoices/89/payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paid_amount": 15000.00
  }'

# If multiple matches returned, link to specific job
curl -X POST https://api.example.com/invoices/89/link-to-job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 42
  }'
```

---

## Changelog

### Version 1.0.0 (2024-01-10)
- Initial release
- Manual job creation with duplicate prevention
- Smart invoice-to-job linking
- Client management endpoints
- Audit logging

---

## Support

For API support or questions:
- Email: api-support@example.com
- Documentation: https://docs.example.com/api
- Status Page: https://status.example.com
