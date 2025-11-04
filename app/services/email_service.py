import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""
    
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.smtp_use_tls = settings.smtp_use_tls
        self.smtp_use_ssl = getattr(settings, 'smtp_use_ssl', False)
        self.email_from = settings.email_from or settings.smtp_username
        self.app_name = settings.app_name
        self.frontend_url = settings.frontend_url
    
    def _get_logo_url(self) -> str:
        """Get the company logo URL for emails."""
        # Check if logo exists and return the URL
        import os
        logo_path = "uploads/company_logo/henam_logo.png"
        if os.path.exists(logo_path):
            return f"{self.frontend_url}/uploads/company_logo/henam_logo.png"
        
        # Try other formats
        for ext in ['.jpg', '.jpeg', '.gif', '.bmp']:
            alt_logo_path = f"uploads/company_logo/henam_logo{ext}"
            if os.path.exists(alt_logo_path):
                return f"{self.frontend_url}/uploads/company_logo/henam_logo{ext}"
        
        return None

    def _create_html_template(self, template_type: str, data: Dict[str, Any]) -> str:
        """Create HTML email template based on type and data."""
        
        # Get logo URL
        logo_url = self._get_logo_url()
        logo_html = ""
        if logo_url:
            logo_html = f'<img src="{logo_url}" alt="Henam Logo" style="max-width: 150px; height: auto; margin-bottom: 20px;">'
        
        base_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{data.get('subject', 'Notification')}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: #ffffff;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .info-box {{
                    background-color: #f8f9fa;
                    border-left: 4px solid #4caf50;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }}
                .status-badge {{
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                }}
                .status-pending {{ background-color: #fff3cd; color: #856404; }}
                .status-in-progress {{ background-color: #d1ecf1; color: #0c5460; }}
                .status-completed {{ background-color: #d4edda; color: #155724; }}
                .status-cancelled {{ background-color: #f8d7da; color: #721c24; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    {logo_html}
                    <h1>{self.app_name}</h1>
                </div>
                <div class="content">
                    {self._get_template_content(template_type, data)}
                </div>
                <div class="footer">
                    <p>This is an automated notification from {self.app_name}</p>
                    <p>© {datetime.now().year} {self.app_name}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return base_template
    
    def _get_template_content(self, template_type: str, data: Dict[str, Any]) -> str:
        """Get specific template content based on type."""
        
        if template_type == "job_created":
            return f"""
                <h2>New Job Created</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>A new job has been created and assigned in the system.</p>
                
                <div class="info-box">
                    <h3>{data.get('title', 'Untitled Job')}</h3>
                    <p><strong>Client:</strong> {data.get('client', 'N/A')}</p>
                    <p><strong>Assigned by:</strong> {data.get('assigner_name', 'System')}</p>
                    <p><strong>Assigned to:</strong> {data.get('assignee_name', 'Team')}</p>
                    <p><strong>Start Date:</strong> {data.get('start_date', 'N/A')}</p>
                    <p><strong>End Date:</strong> {data.get('end_date', 'N/A')}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-pending">Not Started</span></p>
                </div>
                
                <p>{data.get('description', 'No additional description provided.')}</p>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Job Details</a>
                </div>
            """
        
        elif template_type == "job_updated":
            return f"""
                <h2>Job Updated</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>The job "{data.get('title', 'Untitled Job')}" has been updated.</p>
                
                <div class="info-box">
                    <h3>{data.get('title', 'Untitled Job')}</h3>
                    <p><strong>Updated by:</strong> {data.get('updated_by', 'System')}</p>
                    <p><strong>Progress:</strong> {data.get('progress', 0)}%</p>
                    <p><strong>Status:</strong> <span class="status-badge status-{data.get('status', 'pending').replace('_', '-')}">{data.get('status', 'pending').replace('_', ' ').title()}</span></p>
                    <p><strong>Updated at:</strong> {data.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M'))}</p>
                </div>
                
                <p><strong>Changes:</strong> {data.get('changes', 'Progress and status updated.')}</p>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Job Details</a>
                </div>
            """
        
        elif template_type == "task_created":
            return f"""
                <h2>New Task Assigned</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>A new task has been assigned to you.</p>
                
                <div class="info-box">
                    <h3>{data.get('title', 'Untitled Task')}</h3>
                    <p><strong>Assigned by:</strong> {data.get('assigner_name', 'System')}</p>
                    <p><strong>Priority:</strong> {data.get('priority', 'Medium').title()}</p>
                    <p><strong>Deadline:</strong> {data.get('deadline', 'No deadline set')}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-pending">Pending</span></p>
                </div>
                
                <p><strong>Description:</strong></p>
                <p>{data.get('description', 'No description provided.')}</p>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Task Details</a>
                </div>
            """
        
        elif template_type == "task_updated":
            return f"""
                <h2>Task Updated</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>The task "{data.get('title', 'Untitled Task')}" has been updated.</p>
                
                <div class="info-box">
                    <h3>{data.get('title', 'Untitled Task')}</h3>
                    <p><strong>Updated by:</strong> {data.get('updated_by', 'System')}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-{data.get('status', 'pending').replace('_', '-')}">{data.get('status', 'pending').replace('_', ' ').title()}</span></p>
                    <p><strong>Updated at:</strong> {data.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M'))}</p>
                </div>
                
                <p><strong>Changes:</strong> {data.get('changes', 'Status and progress updated.')}</p>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Task Details</a>
                </div>
            """
        
        elif template_type == "password_reset":
            return f"""
                <h2>Password Reset Request</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>We received a request to reset your password for your {self.app_name} account.</p>
                
                <div class="info-box">
                    <h3>Reset Your Password</h3>
                    <p><strong>Account:</strong> {data.get('email', 'N/A')}</p>
                    <p><strong>Requested at:</strong> {data.get('requested_at', datetime.now().strftime('%Y-%m-%d %H:%M'))}</p>
                    <p><strong>Expires in:</strong> {data.get('expires_in', '30 minutes')}</p>
                </div>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <a href="{data.get('reset_url', self.frontend_url)}" class="button">Reset Password</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    <strong>Security Notice:</strong><br>
                    • This link will expire in {data.get('expires_in', '30 minutes')}<br>
                    • If you didn't request this reset, please ignore this email<br>
                    • For security, you'll be logged out of all devices after resetting
                </p>
            """
        
        elif template_type == "invoice_created":
            return f"""
                <h2>💰 New Invoice Created</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>A new invoice has been created in the system:</p>
                
                <div class="info-box">
                    <h3>Invoice Details</h3>
                    <p><strong>Invoice Number:</strong> #{data.get('invoice_number', 'N/A')}</p>
                    <p><strong>Client:</strong> {data.get('client_name', 'N/A')}</p>
                    <p><strong>Service Type:</strong> {data.get('job_type', 'Professional Services')}</p>
                    <p><strong>Amount:</strong> ₦{data.get('amount', 0):,.2f}</p>
                    <p><strong>Due Date:</strong> {data.get('due_date', 'N/A')}</p>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>The invoice PDF has been automatically generated</li>
                    <li>When the client makes any payment, the system will automatically convert this invoice to a job</li>
                    <li>All team members will be notified when the conversion happens</li>
                </ul>
                
                <p>Please log in to the system to view the full invoice details and download the PDF.</p>
            """
        
        elif template_type == "invoice_converted_to_job":
            return f"""
                <h2>🎉 Invoice Converted to Job</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>Great news! Payment has been received and an invoice has been automatically converted to a job:</p>
                
                <div class="info-box">
                    <h3>Conversion Details</h3>
                    <p><strong>Invoice:</strong> #{data.get('invoice_number', 'N/A')}</p>
                    <p><strong>Client:</strong> {data.get('client_name', 'N/A')}</p>
                    <p><strong>New Job:</strong> {data.get('job_title', 'N/A')} (ID: #{data.get('job_id', 'N/A')})</p>
                    <p><strong>Payment Received:</strong> ₦{data.get('paid_amount', 0):,.2f} of ₦{data.get('total_amount', 0):,.2f}</p>
                </div>
                
                <p><strong>What happens next:</strong></p>
                <ul>
                    <li>The job is now available in the Jobs section</li>
                    <li>Team members can start working on the project</li>
                    <li>Progress can be tracked and updated</li>
                    <li>Tasks can be assigned to team members</li>
                </ul>
                
                <p>Please log in to the system to view the new job and start managing the project.</p>
            """
        
        elif template_type == "payment_updated":
            return f"""
                <h2>💳 Invoice Payment Updated</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>A payment has been updated for an invoice:</p>
                
                <div class="info-box">
                    <h3>Payment Details</h3>
                    <p><strong>Invoice:</strong> #{data.get('invoice_number', 'N/A')}</p>
                    <p><strong>Client:</strong> {data.get('client_name', 'N/A')}</p>
                    <p><strong>Total Amount:</strong> ₦{data.get('amount', 0):,.2f}</p>
                    <p><strong>Amount Paid:</strong> ₦{data.get('paid_amount', 0):,.2f}</p>
                    <p><strong>Remaining Balance:</strong> ₦{data.get('pending_amount', 0):,.2f}</p>
                    <p><strong>Status:</strong> {data.get('status', 'N/A').title()}</p>
                </div>
                
                <p>You can view the full invoice details in the Finance section of the system.</p>
            """
        
        elif template_type == "team_job_assignment":
            return f"""
                <h2>🎯 Your Team Has Been Assigned a New Job</h2>
                <p>Hello {data.get('recipient_name', 'Team Supervisor')},</p>
                <p>Your team has been assigned a new job. Please review the details below and coordinate with your team members to begin work.</p>
                
                <div class="info-box">
                    <h3>Job Assignment Details</h3>
                    <p><strong>Job Title:</strong> {data.get('job_title', 'N/A')}</p>
                    <p><strong>Client:</strong> {data.get('client_name', 'N/A')}</p>
                    <p><strong>Assigned Team:</strong> {data.get('team_name', 'N/A')}</p>
                    <p><strong>Assigned By:</strong> {data.get('assigned_by', 'System')}</p>
                    <p><strong>Start Date:</strong> {data.get('start_date', 'N/A')}</p>
                    {f'<p><strong>End Date:</strong> {data.get("end_date", "N/A")}</p>' if data.get('end_date') else ''}
                    <p><strong>Current Status:</strong> <span class="status-badge status-{data.get('status', 'not-started').replace('_', '-')}">{data.get('status', 'not_started').replace('_', ' ').title()}</span></p>
                    <p><strong>Progress:</strong> {data.get('progress', 0)}%</p>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Review the job requirements with your team</li>
                    <li>Plan the project timeline and assign tasks to team members</li>
                    <li>Update the job progress as work is completed</li>
                    <li>Coordinate with the client as needed</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Job Details</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                    <strong>Note:</strong> As the team supervisor, you are responsible for coordinating this project and ensuring timely completion. Please log in to the system to access all job details and begin project management.
                </p>
            """
        
        elif template_type == "user_job_assignment":
            return f"""
                <h2>🎯 You Have Been Assigned a New Job</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>You have been assigned as the supervisor for a new job. Please review the details below and begin coordinating the work.</p>
                
                <div class="info-box">
                    <h3>Job Assignment Details</h3>
                    <p><strong>Job Title:</strong> {data.get('job_title', 'N/A')}</p>
                    <p><strong>Client:</strong> {data.get('client_name', 'N/A')}</p>
                    <p><strong>Assigned By:</strong> {data.get('assigned_by', 'System')}</p>
                    <p><strong>Start Date:</strong> {data.get('start_date', 'N/A')}</p>
                    {f'<p><strong>End Date:</strong> {data.get("end_date", "N/A")}</p>' if data.get('end_date') else ''}
                    <p><strong>Current Status:</strong> <span class="status-badge status-{data.get('status', 'not-started').replace('_', '-')}">{data.get('status', 'not_started').replace('_', ' ').title()}</span></p>
                    <p><strong>Progress:</strong> {data.get('progress', 0)}%</p>
                </div>
                
                <p><strong>Your Responsibilities:</strong></p>
                <ul>
                    <li>Review the job requirements and scope</li>
                    <li>Plan the project timeline and milestones</li>
                    <li>Update the job progress as work is completed</li>
                    <li>Coordinate with the client as needed</li>
                    <li>Ensure timely completion of the project</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Job Details</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                    <strong>Note:</strong> As the assigned supervisor, you are responsible for managing this project. Please log in to the system to access all job details and begin work.
                </p>
            """
        
        elif template_type == "job_completed":
            return f"""
                <h2>✅ Job Completed Successfully</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>Great news! The following job has been marked as completed:</p>
                
                <div class="info-box">
                    <h3>Completed Job Details</h3>
                    <p><strong>Job Title:</strong> {data.get('job_title', 'N/A')}</p>
                    <p><strong>Client:</strong> {data.get('client_name', 'N/A')}</p>
                    <p><strong>Completed By:</strong> {data.get('completed_by', 'Team')}</p>
                    <p><strong>Completion Date:</strong> {data.get('completion_date', 'N/A')}</p>
                    <p><strong>Final Progress:</strong> 100%</p>
                    <p><strong>Status:</strong> <span class="status-badge status-completed">Completed</span></p>
                </div>
                
                <p><strong>Project Summary:</strong></p>
                <p>{data.get('summary', 'The project has been successfully completed and delivered to the client.')}</p>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Job Details</a>
                </div>
            """
        
        elif template_type == "team_member_added":
            return f"""
                <h2>👥 New Team Member Added</h2>
                <p>Hello {data.get('recipient_name', 'Team Supervisor')},</p>
                <p>A new member has been added to your team:</p>
                
                <div class="info-box">
                    <h3>Team Update</h3>
                    <p><strong>Team:</strong> {data.get('team_name', 'N/A')}</p>
                    <p><strong>New Member:</strong> {data.get('member_name', 'N/A')}</p>
                    <p><strong>Member Email:</strong> {data.get('member_email', 'N/A')}</p>
                    <p><strong>Added By:</strong> {data.get('added_by', 'System')}</p>
                    <p><strong>Date Added:</strong> {data.get('date_added', datetime.now().strftime('%Y-%m-%d'))}</p>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Welcome the new team member</li>
                    <li>Brief them on current projects and responsibilities</li>
                    <li>Assign appropriate tasks and access permissions</li>
                    <li>Introduce them to other team members</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="{data.get('view_url', self.frontend_url)}" class="button">View Team Details</a>
                </div>
            """
        
        else:
            return f"""
                <h2>📢 Notification</h2>
                <p>Hello {data.get('recipient_name', 'User')},</p>
                <p>{data.get('message', 'You have a new notification.')}</p>
            """
    
    def send_email(self, to_emails: List[str], subject: str, template_type: str, data: Dict[str, Any]) -> bool:
        """Send email notification."""
        try:
            logger.info(f"🔍 Email Service Debug - Starting email send process")
            logger.info(f"📧 To: {to_emails}")
            logger.info(f"📝 Subject: {subject}")
            logger.info(f"🎨 Template: {template_type}")
            
            # Check SMTP configuration
            logger.info(f"🔧 SMTP Config Check:")
            logger.info(f"   Host: {self.smtp_host}")
            logger.info(f"   Port: {self.smtp_port}")
            logger.info(f"   Username: {'***configured***' if self.smtp_username else 'NOT SET'}")
            logger.info(f"   Password: {'***configured***' if self.smtp_password else 'NOT SET'}")
            logger.info(f"   From: {self.email_from}")
            logger.info(f"   Use TLS: {self.smtp_use_tls}")
            
            if not self.smtp_username or not self.smtp_password:
                logger.error("❌ SMTP credentials not configured. Email not sent.")
                logger.error(f"   Username set: {bool(self.smtp_username)}")
                logger.error(f"   Password set: {bool(self.smtp_password)}")
                return False
            
            logger.info("✅ SMTP credentials are configured, proceeding with email send...")
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_from
            msg['To'] = ', '.join(to_emails)
            
            # Create HTML content
            html_content = self._create_html_template(template_type, data)
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            logger.info("📨 Attempting to connect to SMTP server...")
            
            # Send email using SSL or TLS based on configuration
            if self.smtp_use_ssl:
                # Use SMTP_SSL for port 465
                import ssl
                logger.info("🔒 Using SSL connection (port 465)...")
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context, timeout=30) as server:
                    logger.info("🔗 Connected to SMTP server with SSL")
                    
                    logger.info("🔐 Attempting to login...")
                    server.login(self.smtp_username, self.smtp_password)
                    logger.info("✅ Successfully logged in to SMTP server")
                    
                    logger.info("📤 Sending email message...")
                    server.send_message(msg)
                    logger.info("✅ Email message sent successfully")
            else:
                # Use SMTP with STARTTLS for port 587
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                    logger.info("🔗 Connected to SMTP server")
                    
                    if self.smtp_use_tls:
                        logger.info("🔒 Starting TLS encryption...")
                        server.starttls()
                        logger.info("✅ TLS encryption established")
                    
                    logger.info("🔐 Attempting to login...")
                    server.login(self.smtp_username, self.smtp_password)
                    logger.info("✅ Successfully logged in to SMTP server")
                    
                    logger.info("📤 Sending email message...")
                    server.send_message(msg)
                    logger.info("✅ Email message sent successfully")
            
            logger.info(f"🎉 Email sent successfully to {to_emails} with subject: {subject}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ SMTP Authentication failed: {str(e)}")
            logger.error("   Check your email credentials (username/password)")
            return False
        except smtplib.SMTPConnectError as e:
            logger.error(f"❌ SMTP Connection failed: {str(e)}")
            logger.error(f"   Check SMTP host ({self.smtp_host}) and port ({self.smtp_port})")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"❌ SMTP Error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_emails}: {str(e)}")
            logger.error(f"   Error type: {type(e).__name__}")
            return False
    
    def send_job_created_notification(self, job_data: Dict[str, Any], recipients: List[Dict[str, str]]) -> bool:
        """Send job created notification to all users."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting job created notification")
        print(f"📧 EMAIL SERVICE DEBUG: Job data: {job_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Recipients: {recipients}")
        
        subject = f"New Job Created: {job_data.get('title', 'Untitled')} assigned to {job_data.get('assignee_name', 'Team')}"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        success_count = 0
        for recipient in recipients:
            print(f"📧 EMAIL SERVICE DEBUG: Sending email to {recipient['email']}")
            data = {
                **job_data,
                'recipient_name': recipient.get('name', 'User'),
                'view_url': f"{self.frontend_url}/jobs/{job_data.get('id')}"
            }
            
            result = self.send_email([recipient['email']], subject, "job_created", data)
            print(f"📧 EMAIL SERVICE DEBUG: Email result for {recipient['email']}: {result}")
            if result:
                success_count += 1
        
        print(f"📧 EMAIL SERVICE DEBUG: Job created notifications sent: {success_count}/{len(recipients)} successful")
        logger.info(f"Job created notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0
    
    def send_job_updated_notification(self, job_data: Dict[str, Any], recipients: List[Dict[str, str]], updated_by: str, changes: str) -> bool:
        """Send job updated notification to job participants."""
        subject = f"Job Update: {job_data.get('title', 'Untitled')} progress updated by {updated_by}"
        
        success_count = 0
        for recipient in recipients:
            data = {
                **job_data,
                'recipient_name': recipient.get('name', 'User'),
                'updated_by': updated_by,
                'changes': changes,
                'view_url': f"{self.frontend_url}/jobs/{job_data.get('id')}"
            }
            
            if self.send_email([recipient['email']], subject, "job_updated", data):
                success_count += 1
        
        logger.info(f"Job updated notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0
    
    def send_task_created_notification(self, task_data: Dict[str, Any], recipients: List[Dict[str, str]]) -> bool:
        """Send task created notification to assigner and assignee."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting task created notification")
        print(f"📧 EMAIL SERVICE DEBUG: Task data: {task_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Recipients: {recipients}")
        
        subject = f"New Task Assigned: {task_data.get('title', 'Untitled')} by {task_data.get('assigner_name', 'System')}"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        success_count = 0
        for recipient in recipients:
            print(f"📧 EMAIL SERVICE DEBUG: Sending email to {recipient['email']}")
            data = {
                **task_data,
                'recipient_name': recipient.get('name', 'User'),
                'view_url': f"{self.frontend_url}/tasks/{task_data.get('id')}"
            }
            
            result = self.send_email([recipient['email']], subject, "task_created", data)
            print(f"📧 EMAIL SERVICE DEBUG: Email result for {recipient['email']}: {result}")
            if result:
                success_count += 1
        
        print(f"📧 EMAIL SERVICE DEBUG: Task created notifications sent: {success_count}/{len(recipients)} successful")
        logger.info(f"Task created notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0
    
    def send_task_updated_notification(self, task_data: Dict[str, Any], recipients: List[Dict[str, str]], updated_by: str, changes: str) -> bool:
        """Send task updated notification to assigner and assignee."""
        subject = f"Task Update: {task_data.get('title', 'Untitled')} marked as {task_data.get('status', 'updated')} by {updated_by}"
        
        success_count = 0
        for recipient in recipients:
            data = {
                **task_data,
                'recipient_name': recipient.get('name', 'User'),
                'updated_by': updated_by,
                'changes': changes,
                'view_url': f"{self.frontend_url}/tasks/{task_data.get('id')}"
            }
            
            if self.send_email([recipient['email']], subject, "task_updated", data):
                success_count += 1
        
        logger.info(f"Task updated notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0
    
    def send_password_reset_email(self, user_email: str, user_name: str, reset_token: str, expires_in_minutes: int = 30) -> bool:
        """Send password reset email to user."""
        subject = f"Password Reset Request - {self.app_name}"
        
        # Create reset URL with token
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
        
        data = {
            'recipient_name': user_name,
            'email': user_email,
            'reset_url': reset_url,
            'requested_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'expires_in': f"{expires_in_minutes} minutes"
        }
        
        logger.info(f"Sending password reset email to {user_email}")
        result = self.send_email([user_email], subject, "password_reset", data)
        
        if result:
            logger.info(f"Password reset email sent successfully to {user_email}")
        else:
            logger.error(f"Failed to send password reset email to {user_email}")
        
        return result

    def send_invoice_created_notification(self, invoice_data: Dict[str, Any], recipients: List[Dict[str, str]]) -> bool:
        """Send invoice created notification to all users."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting invoice created notification")
        print(f"📧 EMAIL SERVICE DEBUG: Invoice data: {invoice_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Recipients: {recipients}")
        
        subject = f"New Invoice Created: #{invoice_data.get('invoice_number', 'N/A')} for {invoice_data.get('client_name', 'Client')}"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        success_count = 0
        for recipient in recipients:
            data = {
                'recipient_name': recipient['name'],
                'invoice_number': invoice_data.get('invoice_number', 'N/A'),
                'client_name': invoice_data.get('client_name', 'Client'),
                'job_type': invoice_data.get('job_type', 'Professional Services'),
                'amount': invoice_data.get('amount', 0),
                'due_date': invoice_data.get('due_date', ''),
                'description': invoice_data.get('description', ''),
            }
            
            if self.send_email([recipient['email']], subject, "invoice_created", data):
                success_count += 1
        
        logger.info(f"Invoice created notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0

    def send_invoice_converted_to_job_notification(self, invoice_data: Dict[str, Any], job_data: Dict[str, Any], recipients: List[Dict[str, str]]) -> bool:
        """Send notification when invoice is converted to job due to payment."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting invoice-to-job conversion notification")
        
        subject = f"Invoice Converted to Job: Payment received for #{invoice_data.get('invoice_number', 'N/A')}"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        success_count = 0
        for recipient in recipients:
            data = {
                'recipient_name': recipient['name'],
                'invoice_number': invoice_data.get('invoice_number', 'N/A'),
                'client_name': invoice_data.get('client_name', 'Client'),
                'job_title': job_data.get('title', 'N/A'),
                'job_id': job_data.get('id', 'N/A'),
                'paid_amount': invoice_data.get('paid_amount', 0),
                'total_amount': invoice_data.get('amount', 0),
            }
            
            if self.send_email([recipient['email']], subject, "invoice_converted_to_job", data):
                success_count += 1
        
        logger.info(f"Invoice conversion notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0


    def send_payment_updated_notification(self, invoice_data: Dict[str, Any], recipients: List[Dict[str, str]]) -> bool:
        """Send payment updated notification to all users."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting payment updated notification")
        print(f"📧 EMAIL SERVICE DEBUG: Recipients count: {len(recipients)}")
        print(f"📧 EMAIL SERVICE DEBUG: Invoice data: {invoice_data}")
        
        if not recipients:
            print("📧 EMAIL SERVICE DEBUG: No recipients provided")
            return False
        
        subject = f"Payment Updated: Invoice #{invoice_data.get('invoice_number', 'N/A')} - {invoice_data.get('client_name', 'Unknown Client')}"
        
        success_count = 0
        for recipient in recipients:
            try:
                # Add recipient name to data for personalization
                email_data = {**invoice_data, 'recipient_name': recipient.get('name', 'User')}
                
                if self.send_email([recipient['email']], subject, "payment_updated", email_data):
                    success_count += 1
                    print(f"📧 EMAIL SERVICE DEBUG: Successfully sent to {recipient['email']}")
                else:
                    print(f"📧 EMAIL SERVICE DEBUG: Failed to send to {recipient['email']}")
            except Exception as e:
                print(f"📧 EMAIL SERVICE DEBUG: Error sending to {recipient.get('email', 'unknown')}: {e}")
        
        print(f"📧 EMAIL SERVICE DEBUG: Payment notification sent to {success_count}/{len(recipients)} recipients")
        return success_count > 0

    def send_team_job_assignment_notification(self, job_data: Dict[str, Any], team_data: Dict[str, Any], supervisor_data: Dict[str, str], assigned_by: str) -> bool:
        """Send job assignment notification to team supervisor when a job is assigned to their team."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting team job assignment notification")
        print(f"📧 EMAIL SERVICE DEBUG: Job data: {job_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Team data: {team_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Supervisor: {supervisor_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Assigned by: {assigned_by}")
        
        if not supervisor_data or not supervisor_data.get('email'):
            print("📧 EMAIL SERVICE DEBUG: No supervisor email provided")
            return False
        
        subject = f"Team Assignment: {job_data.get('title', 'New Job')} assigned to {team_data.get('name', 'your team')}"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        # Format dates for display
        start_date = job_data.get('start_date', '')
        if start_date:
            try:
                if isinstance(start_date, str):
                    from datetime import datetime
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                else:
                    start_date = start_date.strftime('%Y-%m-%d')
            except:
                start_date = str(start_date)
        
        end_date = job_data.get('end_date', '')
        if end_date:
            try:
                if isinstance(end_date, str):
                    from datetime import datetime
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                else:
                    end_date = end_date.strftime('%Y-%m-%d')
            except:
                end_date = str(end_date)
        
        data = {
            'recipient_name': supervisor_data.get('name', 'Team Supervisor'),
            'job_title': job_data.get('title', 'N/A'),
            'client_name': job_data.get('client', 'N/A'),
            'team_name': team_data.get('name', 'N/A'),
            'assigned_by': assigned_by,
            'start_date': start_date or 'Not specified',
            'end_date': end_date or 'Not specified',
            'status': job_data.get('status', 'not_started'),
            'progress': job_data.get('progress', 0),
            'view_url': f"{self.frontend_url}/jobs/{job_data.get('id')}"
        }
        
        try:
            result = self.send_email([supervisor_data['email']], subject, "team_job_assignment", data)
            print(f"📧 EMAIL SERVICE DEBUG: Email result for {supervisor_data['email']}: {result}")
            
            if result:
                logger.info(f"Team job assignment notification sent successfully to {supervisor_data['email']}")
            else:
                logger.error(f"Failed to send team job assignment notification to {supervisor_data['email']}")
            
            return result
            
        except Exception as e:
            print(f"📧 EMAIL SERVICE DEBUG: Error sending team assignment email: {e}")
            logger.error(f"Error sending team job assignment notification: {e}")
            return False


    def send_user_job_assignment_notification(self, job_data: Dict[str, Any], user_data: Dict[str, str], assigned_by: str) -> bool:
        """Send job assignment notification to user when a job is assigned to them."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting user job assignment notification")
        print(f"📧 EMAIL SERVICE DEBUG: Job data: {job_data}")
        print(f"📧 EMAIL SERVICE DEBUG: User: {user_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Assigned by: {assigned_by}")
        
        if not user_data or not user_data.get('email'):
            print("📧 EMAIL SERVICE DEBUG: No user email provided")
            return False
        
        subject = f"Job Assignment: {job_data.get('title', 'New Job')} assigned to you"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        # Format dates for display
        start_date = job_data.get('start_date', '')
        if start_date:
            try:
                if isinstance(start_date, str):
                    from datetime import datetime
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                else:
                    start_date = start_date.strftime('%Y-%m-%d')
            except:
                start_date = str(start_date)
        
        end_date = job_data.get('end_date', '')
        if end_date:
            try:
                if isinstance(end_date, str):
                    from datetime import datetime
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                else:
                    end_date = end_date.strftime('%Y-%m-%d')
            except:
                end_date = str(end_date)
        
        data = {
            'recipient_name': user_data.get('name', 'User'),
            'job_title': job_data.get('title', 'N/A'),
            'client_name': job_data.get('client', 'N/A'),
            'assigned_by': assigned_by,
            'start_date': start_date or 'Not specified',
            'end_date': end_date or 'Not specified',
            'status': job_data.get('status', 'not_started'),
            'progress': job_data.get('progress', 0),
            'view_url': f"{self.frontend_url}/jobs/{job_data.get('id')}"
        }
        
        try:
            result = self.send_email([user_data['email']], subject, "user_job_assignment", data)
            print(f"📧 EMAIL SERVICE DEBUG: Email result for {user_data['email']}: {result}")
            
            if result:
                logger.info(f"User job assignment notification sent successfully to {user_data['email']}")
            else:
                logger.error(f"Failed to send user job assignment notification to {user_data['email']}")
            
            return result
            
        except Exception as e:
            print(f"📧 EMAIL SERVICE DEBUG: Error sending user assignment email: {e}")
            logger.error(f"Error sending user job assignment notification: {e}")
            return False
    
    def send_job_completed_notification(self, job_data: Dict[str, Any], recipients: List[Dict[str, str]], completed_by: str) -> bool:
        """Send job completed notification to all relevant users."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting job completed notification")
        print(f"📧 EMAIL SERVICE DEBUG: Job data: {job_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Recipients: {recipients}")
        
        subject = f"Job Completed: {job_data.get('title', 'Job')} has been marked as completed"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        success_count = 0
        for recipient in recipients:
            data = {
                'recipient_name': recipient.get('name', 'User'),
                'job_title': job_data.get('title', 'N/A'),
                'client_name': job_data.get('client', 'N/A'),
                'completed_by': completed_by,
                'completion_date': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'summary': f"The job '{job_data.get('title')}' for client '{job_data.get('client')}' has been successfully completed.",
                'view_url': f"{self.frontend_url}/jobs/{job_data.get('id')}"
            }
            
            if self.send_email([recipient['email']], subject, "job_completed", data):
                success_count += 1
        
        logger.info(f"Job completed notifications sent: {success_count}/{len(recipients)} successful")
        return success_count > 0
    
    def send_team_member_added_notification(self, team_data: Dict[str, Any], member_data: Dict[str, str], supervisor_data: Dict[str, str], added_by: str) -> bool:
        """Send notification to team supervisor when a new member is added."""
        print(f"📧 EMAIL SERVICE DEBUG: Starting team member added notification")
        print(f"📧 EMAIL SERVICE DEBUG: Team data: {team_data}")
        print(f"📧 EMAIL SERVICE DEBUG: New member: {member_data}")
        print(f"📧 EMAIL SERVICE DEBUG: Supervisor: {supervisor_data}")
        
        if not supervisor_data or not supervisor_data.get('email'):
            print("📧 EMAIL SERVICE DEBUG: No supervisor email provided")
            return False
        
        subject = f"New Team Member: {member_data.get('name', 'User')} added to {team_data.get('name', 'your team')}"
        print(f"📧 EMAIL SERVICE DEBUG: Subject: {subject}")
        
        data = {
            'recipient_name': supervisor_data.get('name', 'Team Supervisor'),
            'team_name': team_data.get('name', 'N/A'),
            'member_name': member_data.get('name', 'N/A'),
            'member_email': member_data.get('email', 'N/A'),
            'added_by': added_by,
            'date_added': datetime.now().strftime('%Y-%m-%d'),
            'view_url': f"{self.frontend_url}/teams/{team_data.get('id')}"
        }
        
        try:
            result = self.send_email([supervisor_data['email']], subject, "team_member_added", data)
            print(f"📧 EMAIL SERVICE DEBUG: Email result for {supervisor_data['email']}: {result}")
            
            if result:
                logger.info(f"Team member added notification sent successfully to {supervisor_data['email']}")
            else:
                logger.error(f"Failed to send team member added notification to {supervisor_data['email']}")
            
            return result
            
        except Exception as e:
            print(f"📧 EMAIL SERVICE DEBUG: Error sending team member added email: {e}")
            logger.error(f"Error sending team member added notification: {e}")
            return False


# Global email service instance
email_service = EmailService()