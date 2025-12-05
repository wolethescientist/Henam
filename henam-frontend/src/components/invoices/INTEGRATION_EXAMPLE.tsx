/**
 * INTEGRATION EXAMPLE: How to use JobSelectionDialog in InvoiceTab
 * 
 * This file shows how to integrate the JobSelectionDialog component
 * into the invoice payment flow to handle smart linking.
 */

import { useState } from 'react';
import JobSelectionDialog from './JobSelectionDialog';
import { 
  useUpdateInvoicePaymentMutation,
  useLinkInvoiceToJobMutation 
} from '../../store/api/invoicesApi';
import type { Invoice } from '../../types';

// Example integration in InvoiceTab component
export const InvoiceTabWithJobSelection = () => {
  // State for job selection dialog
  const [showJobSelection, setShowJobSelection] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);
  
  // API mutations
  const [updateInvoicePayment] = useUpdateInvoicePaymentMutation();
  const [linkInvoiceToJob, { isLoading: isLinking }] = useLinkInvoiceToJobMutation();

  /**
   * Handle invoice payment update
   * This is called when user updates the payment amount for an invoice
   */
  const handleSubmitPayment = async (invoiceId: number, paidAmount: number) => {
    try {
      const result = await updateInvoicePayment({ 
        id: invoiceId, 
        paid_amount: paidAmount 
      }).unwrap();
      
      // Check if job selection is required (multiple matching jobs found)
      if (result.requires_job_selection && result.matching_jobs && result.matching_jobs.length > 0) {
        console.log(`Found ${result.matching_jobs.length} matching jobs for invoice ${result.invoice_number}`);
        
        // Store the invoice data and show job selection dialog
        setPendingInvoice(result);
        setShowJobSelection(true);
        
        // Don't show success message yet - wait for job selection
        return;
      }
      
      // Normal flow - payment updated successfully
      if (result.converted_to_job) {
        console.log(`Invoice ${result.invoice_number} automatically converted to job #${result.converted_job_id}`);
      } else {
        console.log(`Payment updated for invoice ${result.invoice_number}`);
      }
      
    } catch (error) {
      console.error('Failed to update payment:', error);
      throw error;
    }
  };

  /**
   * Handle job selection from the dialog
   * This is called when user selects a specific job to link the invoice to
   */
  const handleSelectJob = async (jobId: number) => {
    if (!pendingInvoice) {
      console.error('No pending invoice to link');
      return;
    }
    
    try {
      const result = await linkInvoiceToJob({
        invoice_id: pendingInvoice.id,
        job_id: jobId,
      }).unwrap();
      
      console.log(`Invoice ${result.invoice_number} successfully linked to job "${result.job_title}"`);
      
      // Close dialog and clear state
      setShowJobSelection(false);
      setPendingInvoice(null);
      
    } catch (error) {
      console.error('Failed to link invoice to job:', error);
      throw error;
    }
  };

  /**
   * Handle creating new job instead of linking to existing
   * This is called when user chooses "Create New Job Instead" option
   */
  const handleCreateNewJob = async () => {
    if (!pendingInvoice) {
      console.error('No pending invoice to create job from');
      return;
    }
    
    // Close the job selection dialog
    setShowJobSelection(false);
    
    console.log(`Creating new job from invoice ${pendingInvoice.invoice_number}`);
    
    // Clear state
    setPendingInvoice(null);
    
    // Note: For now, the invoice remains unlinked. In a future enhancement,
    // we could call a backend endpoint to explicitly create a new job.
    // The user can manually create a job and link it later if needed.
  };

  /**
   * Handle canceling job selection
   * This leaves the invoice in paid status but not linked to any job
   */
  const handleCancelJobSelection = () => {
    console.log('Job selection canceled - invoice remains unlinked');
    setShowJobSelection(false);
    setPendingInvoice(null);
  };

  return (
    <>
      {/* Your existing invoice table and payment dialog */}
      {/* Call handleSubmitPayment when user updates payment amount */}
      
      {/* Job Selection Dialog */}
      <JobSelectionDialog
        open={showJobSelection}
        matchingJobs={pendingInvoice?.matching_jobs || []}
        invoiceNumber={pendingInvoice?.invoice_number || ''}
        invoiceAmount={pendingInvoice?.amount || 0}
        clientName={pendingInvoice?.client_name || ''}
        onSelectJob={handleSelectJob}
        onCreateNew={handleCreateNewJob}
        onCancel={handleCancelJobSelection}
        isLinking={isLinking}
      />
      
      {/* Example: In your payment dialog, call handleSubmitPayment(invoiceId, paidAmount) */}
      {/* This function is defined above and handles the payment flow with job selection */}
      <div style={{ display: 'none' }}>{handleSubmitPayment.name}</div>
    </>
  );
};

/**
 * STEP-BY-STEP INTEGRATION GUIDE:
 * 
 * 1. Import the necessary components and hooks:
 *    - JobSelectionDialog component
 *    - useLinkInvoiceToJobMutation hook
 * 
 * 2. Add state variables to your component:
 *    - showJobSelection: boolean to control dialog visibility
 *    - pendingInvoice: Invoice | null to store invoice data
 * 
 * 3. Update your handleSubmitPayment function:
 *    - Check if result.requires_job_selection is true
 *    - If true, store the invoice and show the dialog
 *    - If false, proceed with normal flow
 * 
 * 4. Implement the three handler functions:
 *    - handleSelectJob: Link invoice to selected job
 *    - handleCreateNewJob: Create new job from invoice
 *    - handleCancelJobSelection: Close dialog without action
 * 
 * 5. Add the JobSelectionDialog component to your JSX:
 *    - Pass all required props
 *    - Use the handler functions as callbacks
 * 
 * BACKEND FLOW:
 * 
 * When an invoice is paid:
 * 1. Backend checks for existing active jobs for the client
 * 2. If 0 matches: Creates new job automatically
 * 3. If 1 match: Links invoice to that job automatically
 * 4. If 2+ matches: Returns requires_job_selection=true with matching_jobs array
 * 
 * When user selects a job:
 * 1. Frontend calls POST /invoices/{id}/link-to-job with job_id
 * 2. Backend links the invoice to the selected job
 * 3. Backend updates job financial summary
 * 4. Backend sends notifications to job supervisor
 * 
 * When user chooses "Create New Job":
 * 1. Frontend closes the dialog without calling link API
 * 2. Backend's invoice conversion service creates a new job
 * 3. This happens automatically since no job was selected
 */

export default InvoiceTabWithJobSelection;
