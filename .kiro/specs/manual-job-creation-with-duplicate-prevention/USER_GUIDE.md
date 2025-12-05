# User Guide: Manual Job Creation with Duplicate Prevention

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating Jobs Manually](#creating-jobs-manually)
4. [Handling Duplicate Warnings](#handling-duplicate-warnings)
5. [Client Grouped View](#client-grouped-view)
6. [Invoice-to-Job Linking](#invoice-to-job-linking)
7. [Viewing Job History](#viewing-job-history)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Introduction

The Manual Job Creation feature allows you to create jobs directly from the Jobs page without waiting for invoice payments. This is useful when you need to:

- Set up projects before invoices are created
- Plan team assignments in advance
- Handle recurring projects for existing clients
- Manage projects that don't follow the standard invoice-first workflow

### Key Features

✅ **Manual Job Creation**: Create jobs directly from the Jobs page  
✅ **Duplicate Prevention**: Automatic detection of similar existing jobs  
✅ **Smart Invoice Linking**: Invoices automatically link to existing jobs  
✅ **Client Grouping**: View all jobs organized by client  
✅ **Audit Trail**: Complete history of all job creation decisions  
✅ **Repeat Project Support**: Easy handling of recurring client work  

---

## Getting Started

### Prerequisites

- Active user account with job creation permissions
- Access to the Jobs page
- Understanding of your team structure and client names

### Navigation

1. Log in to the system
2. Click on **"Jobs"** in the main navigation menu
3. You'll see the Jobs page with a **"Create Job"** button in the top right

---

## Creating Jobs Manually

### Step-by-Step Guide

#### 1. Open the Job Creation Form

Click the **"Create Job"** button on the Jobs page.

![Create Job Button](./screenshots/create-job-button.png)

#### 2. Fill in Job Details

The job creation form requires the following information:

**Required Fields:**
- **Job Title**: Descriptive name for the project (e.g., "Website Redesign")
- **Client Name**: The client's company name
- **Start Date**: When the project begins
- **Team**: Which team will handle this job
- **Supervisor**: Team member responsible for oversight

**Optional Fields:**
- **End Date**: Expected completion date
- **Description**: Additional project details

![Job Creation Form](./screenshots/job-creation-form.png)

#### 3. Client Name Autocomplete

As you type the client name, the system will suggest existing clients. This helps:
- Maintain consistent client naming
- Quickly see if you've worked with this client before
- Access client history and previous projects

![Client Autocomplete](./screenshots/client-autocomplete.png)

#### 4. Date Validation

The system validates dates to ensure:
- Start date is not in the past (with 24-hour tolerance)
- End date is after start date
- Dates are in a reasonable range

If validation fails, you'll see an error message explaining the issue.

#### 5. Submit the Form

Click **"Create Job"** to submit. The system will:
1. Check for duplicate jobs (unless you've chosen to skip this)
2. Create the job if no duplicates are found
3. Show a duplicate warning if similar jobs exist
4. Send notifications to assigned team members

---

## Handling Duplicate Warnings

### What is a Duplicate?

The system considers a job a potential duplicate if:
- Same client name (case-insensitive)
- Similar job title (fuzzy matching)
- Existing job status is NOT_STARTED or IN_PROGRESS

### When You See a Duplicate Warning

If the system detects potential duplicates, you'll see a warning dialog with:

![Duplicate Warning Dialog](./screenshots/duplicate-warning.png)

**Information Shown:**
- Side-by-side comparison of your new job vs. existing job(s)
- Existing job status and progress
- Team and supervisor assignments
- Start dates and creation dates

### Your Options

#### Option 1: View Existing Job

Click **"View Existing Job"** to:
- See full details of the existing job
- Check if you can use the existing job instead
- Review invoices already linked to that job

**When to choose this:**
- You realize the job already exists
- You want to link your invoice to the existing job
- You need to check project details before deciding

#### Option 2: Create Anyway

Click **"Create Anyway"** if you need a separate job despite the similarity.

**You'll be asked to provide justification:**
- "Client requested separate project for different department"
- "This is Phase 2 of the original project"
- "Different scope and budget from existing job"

![Justification Dialog](./screenshots/duplicate-justification.png)

**When to choose this:**
- Genuinely different project with same client
- Separate budget or department
- Different timeline or scope
- Client specifically requested separate tracking

**Important:** Your justification is logged in the audit trail for future reference.

#### Option 3: Cancel

Click **"Cancel"** to:
- Return to the job creation form
- Modify the job title or details
- Reconsider if you need to create the job

### Repeat Projects

If you're creating a job for a client with completed projects of the same title, you'll see a **"Repeat Project"** indicator.

![Repeat Project Indicator](./screenshots/repeat-project.png)

**The system will offer to:**
- Copy settings from the previous completed job
- Suggest appending a sequence number (e.g., "Website Redesign - Phase 2")
- Pre-fill team and supervisor from the last project

**Benefits:**
- Faster job creation for recurring work
- Consistent team assignments
- Easy tracking of project iterations

---

## Client Grouped View

### Accessing Client Grouped View

On the Jobs page, toggle the view mode:
- **List View**: Traditional job list
- **Client Grouped View**: Jobs organized by client

![View Toggle](./screenshots/view-toggle.png)

### Features of Client Grouped View

#### Client Summary Cards

Each client shows:
- **Client Name**
- **Total Jobs**: All jobs for this client
- **Active Jobs**: Currently in progress
- **Completed Jobs**: Finished projects
- **Financial Summary**:
  - Total Billed: All invoices issued
  - Total Paid: Payments received
  - Total Pending: Outstanding amounts

![Client Summary Card](./screenshots/client-summary.png)

#### Expanding Client Details

Click on a client card to expand and see:
- All jobs for that client
- Job status and progress
- Team assignments
- Quick actions (view, edit, assign)

![Expanded Client View](./screenshots/client-expanded.png)

### Use Cases

**Project Managers:**
- See all work for a specific client at a glance
- Identify clients with multiple active projects
- Track client relationship over time

**Finance Teams:**
- Review client payment history
- Identify clients with outstanding balances
- Generate client-specific reports

**Team Leaders:**
- See which clients your team works with most
- Plan resource allocation by client
- Track repeat business

---

## Invoice-to-Job Linking

### Automatic Smart Linking

When an invoice is paid, the system automatically:

1. **Searches for matching active jobs** for that client
2. **Takes action based on matches found:**

#### Scenario 1: Single Match Found

✅ **Automatic Linking**
- Invoice is automatically linked to the existing job
- You receive a notification confirming the link
- Job financial summary is updated

![Auto-Link Notification](./screenshots/auto-link-notification.png)

#### Scenario 2: Multiple Matches Found

⚠️ **User Selection Required**
- You'll see a dialog with all matching jobs
- Choose which job to link the invoice to
- Or create a new job if none match

![Job Selection Dialog](./screenshots/job-selection-dialog.png)

**Information shown for each job:**
- Job title and status
- Current progress
- Team and supervisor
- Start date
- Existing invoices

**How to choose:**
1. Review each job's details
2. Select the most appropriate job
3. Click **"Link to This Job"**
4. Or click **"Create New Job Instead"** if none match

#### Scenario 3: No Match Found

🆕 **New Job Created**
- System creates a new job automatically
- Job is marked as created from invoice
- You receive a notification about the new job

### Manual Invoice Linking

You can also manually link invoices to jobs:

1. Go to the Invoices page
2. Find the invoice you want to link
3. Click **"Link to Job"**
4. Select the job from the dropdown
5. Confirm the linking

![Manual Invoice Linking](./screenshots/manual-invoice-link.png)

### Viewing Linked Invoices

On the Job Details page, you'll see:
- All invoices linked to this job
- Payment status for each invoice
- Total billed, paid, and pending amounts

![Job Financial Summary](./screenshots/job-financial-summary.png)

---

## Viewing Job History

### Audit Log

Every job has a complete audit trail showing:
- When and how the job was created
- Who created it
- Duplicate warnings and decisions
- Invoice linkings
- Status changes
- Team reassignments

### Accessing the Audit Log

1. Open a job's details page
2. Click on the **"Audit Log"** tab
3. View the chronological history

![Audit Log Tab](./screenshots/audit-log-tab.png)

### Audit Log Events

**Job Created:**
```
✓ Job created manually by Admin User
  January 10, 2024 at 2:30 PM
  Creation source: MANUAL
```

**Duplicate Warning:**
```
⚠ Duplicate warning shown for 1 matching job(s)
  January 10, 2024 at 2:29 PM
  User chose to create anyway
  Justification: "Client requested separate project for new department"
```

**Invoice Linked:**
```
💰 Invoice INV-2024-0089 ($15,000.00) linked to job
  January 12, 2024 at 10:15 AM
  Linked by Finance Manager
```

**Job Updated:**
```
📝 Job updated by John Doe
  January 15, 2024 at 3:45 PM
  Changes: Progress changed from 0% to 25%
```

### Filtering Audit Logs

Use filters to find specific events:
- **Event Type**: Job Created, Invoice Linked, etc.
- **Date Range**: Last 7 days, Last 30 days, Custom
- **User**: Filter by who performed the action

![Audit Log Filters](./screenshots/audit-log-filters.png)

---

## Best Practices

### Job Creation

✅ **DO:**
- Use consistent client naming (check autocomplete suggestions)
- Provide clear, descriptive job titles
- Set realistic start and end dates
- Assign the appropriate team and supervisor
- Review duplicate warnings carefully
- Provide meaningful justifications when overriding duplicates

❌ **DON'T:**
- Create duplicate jobs unnecessarily
- Use vague job titles like "Project" or "Work"
- Skip duplicate checks without good reason
- Ignore repeat project suggestions
- Create jobs far in advance without confirming dates

### Handling Duplicates

✅ **DO:**
- Check if the existing job can be used instead
- Provide specific justifications when creating duplicates
- Consider if this should be a separate phase or milestone
- Consult with the team lead if unsure

❌ **DON'T:**
- Blindly create duplicates without checking
- Use generic justifications like "because I want to"
- Create separate jobs for the same project scope
- Ignore the system's suggestions

### Client Management

✅ **DO:**
- Use the client grouped view to see the big picture
- Review client history before creating new jobs
- Keep client names consistent across jobs
- Use repeat project features for recurring work

❌ **DON'T:**
- Create variations of the same client name
- Ignore client financial summaries
- Create jobs without checking client history

### Invoice Linking

✅ **DO:**
- Review all matching jobs before selecting one
- Link invoices to the most appropriate job
- Create new jobs only when truly needed
- Check job financial summaries regularly

❌ **DON'T:**
- Always create new jobs for every invoice
- Link invoices to completed jobs
- Ignore the smart linking suggestions
- Link invoices to unrelated jobs

---

## Troubleshooting

### Common Issues

#### Issue: "Justification is required" Error

**Problem:** You tried to create a job despite duplicate warning without providing justification.

**Solution:**
1. Click "Create Anyway" in the duplicate warning dialog
2. Enter a meaningful justification in the text field
3. Submit the form again

---

#### Issue: "Team not found" Error

**Problem:** The selected team doesn't exist or has been deleted.

**Solution:**
1. Refresh the page to get updated team list
2. Select a different team
3. Contact admin if the team should exist

---

#### Issue: "Start date cannot be in the past" Error

**Problem:** You selected a start date that has already passed.

**Solution:**
1. Select today's date or a future date
2. If you need to create a historical job, contact your administrator

---

#### Issue: Duplicate Warning Not Showing

**Problem:** You expected a duplicate warning but didn't see one.

**Possible Reasons:**
- Existing job is COMPLETED (warnings only for active jobs)
- Client name spelling is different
- Job title is significantly different (fuzzy matching threshold)

**Solution:**
- Use the client grouped view to check for existing jobs
- Search for the client name in the jobs list
- Contact support if you believe there's a matching job

---

#### Issue: Can't Find Client in Autocomplete

**Problem:** Client name doesn't appear in autocomplete suggestions.

**Possible Reasons:**
- This is a new client (no previous jobs)
- Client name is spelled differently in existing jobs

**Solution:**
- Type the full client name manually
- Check existing jobs for similar client names
- Use consistent spelling going forward

---

#### Issue: Invoice Linked to Wrong Job

**Problem:** An invoice was automatically linked to the wrong job.

**Solution:**
1. Contact your administrator to unlink the invoice
2. Manually link it to the correct job
3. Check the audit log to understand why it was linked incorrectly

---

### Getting Help

If you encounter issues not covered here:

1. **Check the Audit Log**: Often provides clues about what happened
2. **Contact Your Team Lead**: They may have encountered similar issues
3. **Email Support**: support@example.com with:
   - Screenshot of the error
   - Steps you took before the error
   - Job ID or invoice number (if applicable)
4. **Check System Status**: status.example.com for known issues

---

## FAQ

### General Questions

**Q: Can I create jobs without invoices?**  
A: Yes! That's the main purpose of manual job creation. You can create jobs anytime and link invoices later.

**Q: What happens to manually created jobs when invoices are paid?**  
A: The system will try to link new invoices to your existing jobs automatically, preventing duplicates.

**Q: Can I edit a job after creation?**  
A: Yes, you can edit job details, update progress, and reassign teams/supervisors.

**Q: Who can create jobs manually?**  
A: Any user with job creation permissions. Check with your administrator if you don't see the "Create Job" button.

### Duplicate Detection

**Q: Why does the system think my job is a duplicate?**  
A: The system uses fuzzy matching on client name and job title. Even slight variations might trigger a warning.

**Q: Can I disable duplicate checking?**  
A: You can skip it for individual jobs by providing justification, but it can't be permanently disabled (by design).

**Q: What if I accidentally created a duplicate?**  
A: Contact your administrator to merge or delete the duplicate job. The audit log will show the creation history.

**Q: Does the system check completed jobs for duplicates?**  
A: No, only active jobs (NOT_STARTED or IN_PROGRESS). Completed jobs trigger the "repeat project" feature instead.

### Client Management

**Q: How do I rename a client?**  
A: Contact your administrator. Client names should be updated consistently across all jobs.

**Q: Can I merge two client names?**  
A: Yes, but this requires administrator action to maintain data integrity.

**Q: Why don't I see financial data for some clients?**  
A: Financial data comes from linked invoices. If no invoices are linked, financial fields will be zero.

### Invoice Linking

**Q: Can I link multiple invoices to one job?**  
A: Yes! Jobs can have multiple invoices. The financial summary shows the total.

**Q: Can I unlink an invoice from a job?**  
A: Contact your administrator. Unlinking requires special permissions to maintain audit integrity.

**Q: What if an invoice is for multiple jobs?**  
A: Currently, each invoice can only link to one job. Consider splitting the invoice or creating a parent project.

**Q: Can I link an invoice to a completed job?**  
A: No, invoices can only link to active jobs (NOT_STARTED or IN_PROGRESS).

### Audit Trail

**Q: Who can see the audit log?**  
A: Anyone who can view the job can see its audit log.

**Q: Can audit logs be deleted or modified?**  
A: No, audit logs are immutable for compliance and accountability.

**Q: How long are audit logs kept?**  
A: Indefinitely, as part of the permanent job record.

---

## Keyboard Shortcuts

Speed up your workflow with these shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Open Create Job form |
| `Ctrl/Cmd + K` | Focus client search |
| `Esc` | Close current dialog |
| `Enter` | Submit form (when focused) |
| `Tab` | Navigate between form fields |

---

## Tips & Tricks

### Quick Job Creation

1. Keep a list of common job titles for copy-paste
2. Use client autocomplete to save typing
3. Set up default teams for frequent clients
4. Use repeat project features for recurring work

### Efficient Duplicate Handling

1. Always check the client grouped view first
2. Use descriptive job titles to avoid confusion
3. Add phase numbers for multi-phase projects
4. Keep justifications brief but specific

### Better Client Management

1. Establish client naming conventions with your team
2. Review client summaries before creating new jobs
3. Use the grouped view for client meetings
4. Track repeat business through the audit log

---

## Updates & Changelog

### Version 1.0.0 (January 2024)
- Initial release of manual job creation
- Duplicate detection and prevention
- Smart invoice-to-job linking
- Client grouped view
- Complete audit trail

---

## Feedback

We're constantly improving this feature. Share your feedback:
- **Feature Requests**: feedback@example.com
- **Bug Reports**: support@example.com
- **User Forum**: community.example.com

---

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md) - For developers
- [Video Tutorials](https://example.com/tutorials) - Step-by-step guides
- [Admin Guide](https://example.com/admin-guide) - For system administrators
- [Release Notes](https://example.com/releases) - Latest updates

---

**Last Updated**: January 10, 2024  
**Version**: 1.0.0  
**Document ID**: UG-MJCDP-001
