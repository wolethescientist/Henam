# Job Selection Dialog - Quick Start Guide

## 🚀 Quick Integration (5 minutes)

### Step 1: Import the Component
```typescript
import { JobSelectionDialog } from '../../components/invoices';
import { useLinkInvoiceToJobMutation } from '../../store/api/invoicesApi';
```

### Step 2: Add State
```typescript
const [showJobSelection, setShowJobSelection] = useState(false);
const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);
const [linkInvoiceToJob, { isLoading: isLinking }] = useLinkInvoiceToJobMutation();
```

### Step 3: Update Payment Handler
```typescript
const handleSubmitPayment = async () => {
  const result = await updateInvoicePayment({ id, paid_amount }).unwrap();
  
  // NEW: Check for job selection requirement
  if (result.requires_job_selection && result.matching_jobs) {
    setPendingInvoice(result);
    setShowJobSelection(true);
    return; // Don't show success yet
  }
  
  // Existing success handling...
};
```

### Step 4: Add Handlers
```typescript
const handleSelectJob = async (jobId: number) => {
  await linkInvoiceToJob({
    invoice_id: pendingInvoice!.id,
    job_id: jobId,
  }).unwrap();
  
  setShowJobSelection(false);
  setPendingInvoice(null);
  showSuccess('Invoice linked to job!');
};

const handleCreateNewJob = () => {
  setShowJobSelection(false);
  setPendingInvoice(null);
  showSuccess('Creating new job...');
};
```

### Step 5: Add Component to JSX
```typescript
<JobSelectionDialog
  open={showJobSelection}
  matchingJobs={pendingInvoice?.matching_jobs || []}
  invoiceNumber={pendingInvoice?.invoice_number || ''}
  invoiceAmount={pendingInvoice?.amount || 0}
  clientName={pendingInvoice?.client_name || ''}
  onSelectJob={handleSelectJob}
  onCreateNew={handleCreateNewJob}
  onCancel={() => {
    setShowJobSelection(false);
    setPendingInvoice(null);
  }}
  isLinking={isLinking}
/>
```

## ✅ That's it! You're done.

---

## 📋 Complete Example

```typescript
import React, { useState } from 'react';
import { JobSelectionDialog } from '../../components/invoices';
import { 
  useUpdateInvoicePaymentMutation,
  useLinkInvoiceToJobMutation 
} from '../../store/api/invoicesApi';
import type { Invoice } from '../../types';

export const InvoiceTab = () => {
  // State
  const [showJobSelection, setShowJobSelection] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);
  
  // API
  const [updateInvoicePayment] = useUpdateInvoicePaymentMutation();
  const [linkInvoiceToJob, { isLoading: isLinking }] = useLinkInvoiceToJobMutation();
  
  // Handlers
  const handleSubmitPayment = async (invoiceId: number, paidAmount: number) => {
    try {
      const result = await updateInvoicePayment({ 
        id: invoiceId, 
        paid_amount: paidAmount 
      }).unwrap();
      
      if (result.requires_job_selection && result.matching_jobs) {
        setPendingInvoice(result);
        setShowJobSelection(true);
        return;
      }
      
      showSuccess('Payment updated!');
    } catch (error) {
      showError('Failed to update payment');
    }
  };
  
  const handleSelectJob = async (jobId: number) => {
    try {
      await linkInvoiceToJob({
        invoice_id: pendingInvoice!.id,
        job_id: jobId,
      }).unwrap();
      
      setShowJobSelection(false);
      setPendingInvoice(null);
      showSuccess('Invoice linked to job!');
    } catch (error) {
      showError('Failed to link invoice');
    }
  };
  
  const handleCreateNewJob = () => {
    setShowJobSelection(false);
    setPendingInvoice(null);
    showSuccess('Creating new job...');
  };
  
  return (
    <>
      {/* Your existing invoice UI */}
      
      <JobSelectionDialog
        open={showJobSelection}
        matchingJobs={pendingInvoice?.matching_jobs || []}
        invoiceNumber={pendingInvoice?.invoice_number || ''}
        invoiceAmount={pendingInvoice?.amount || 0}
        clientName={pendingInvoice?.client_name || ''}
        onSelectJob={handleSelectJob}
        onCreateNew={handleCreateNewJob}
        onCancel={() => {
          setShowJobSelection(false);
          setPendingInvoice(null);
        }}
        isLinking={isLinking}
      />
    </>
  );
};
```

---

## 🎯 When Does This Dialog Appear?

The dialog appears when:
1. ✅ User updates invoice payment amount
2. ✅ Backend finds **2 or more** active jobs for the client
3. ✅ Backend returns `requires_job_selection: true`

The dialog does NOT appear when:
- ❌ 0 matching jobs found → Backend creates new job automatically
- ❌ 1 matching job found → Backend links to that job automatically
- ❌ Only completed jobs exist → Backend creates new job

---

## 🔧 Backend Requirements

Make sure your backend returns this structure when multiple jobs are found:

```json
{
  "id": 123,
  "invoice_number": "INV-2024-0001",
  "client_name": "Acme Corp",
  "amount": 5000.00,
  "paid_amount": 5000.00,
  "status": "paid",
  "requires_job_selection": true,
  "matching_jobs": [
    {
      "id": 1,
      "title": "Website Redesign",
      "client": "Acme Corp",
      "status": "in_progress",
      "progress": 45,
      "team_name": "Development Team",
      "supervisor_name": "John Doe",
      "start_date": "2024-01-15T00:00:00"
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Dialog doesn't appear
- Check if `result.requires_job_selection` is `true`
- Check if `result.matching_jobs` has items
- Verify backend is returning the correct structure

### "Link to Job" button disabled
- User must select a job first (radio button)
- Check if `selectedJobId` state is set

### API call fails
- Verify endpoint: `POST /invoices/{id}/link-to-job`
- Check request body: `{ job_id: number }`
- Verify authentication token

### Jobs not filtering
- Check search query state
- Verify `filteredJobs` useMemo dependency array
- Check if job data has the fields being searched

---

## 📚 Additional Resources

- **Full Documentation**: See `README.md`
- **Integration Example**: See `INTEGRATION_EXAMPLE.tsx`
- **Component Structure**: See `COMPONENT_STRUCTURE.md`
- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`

---

## 💡 Tips

1. **Always handle the `requires_job_selection` case** in your payment handler
2. **Store the invoice data** before showing the dialog (you'll need it for linking)
3. **Clear state** after successful linking or cancellation
4. **Show loading states** during API calls for better UX
5. **Handle errors gracefully** and allow users to retry

---

## 🎨 Customization

### Change Dialog Size
```typescript
<JobSelectionDialog
  // ... other props
  PaperProps={{
    sx: {
      minHeight: '70vh',  // Adjust height
      maxHeight: '95vh',
    },
  }}
/>
```

### Custom Styling
The component uses Material-UI's `sx` prop throughout. You can customize by:
1. Wrapping in a styled component
2. Using theme overrides
3. Passing custom styles via props

### Add More Job Details
Modify the `JobSummary` interface in the component to include additional fields, then update the card rendering logic.

---

## ✨ Features Included

- ✅ Search and filter jobs
- ✅ Visual job cards with progress bars
- ✅ Radio button selection
- ✅ Status chips with colors
- ✅ Team and supervisor info
- ✅ Start date display
- ✅ "Create New Job" option
- ✅ Loading states
- ✅ Responsive design
- ✅ Accessibility support

---

## 🚦 Next Steps

After integration:
1. Test with real invoice payment scenarios
2. Verify smart linking works correctly
3. Test edge cases (empty results, network errors)
4. Update user documentation
5. Train users on the new workflow

---

**Need help?** Check the other documentation files or refer to the implementation example.
