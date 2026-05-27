import threading
import logging
import html
import os
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

# Professional, mobile-responsive HTML email template with inline styles
EMAIL_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Task Assigned</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f6f9fc;">
    <tr>
      <td align="center" style="padding: 32px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; border-collapse: collapse;">
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Task Management Portal</h1>
              <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">New Task Assignment</p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #1e293b; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Hello {assignee_name},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                You have been assigned to a new task by <strong>{admin_name}</strong>. Here are the task details:
              </p>
              
              <!-- TASK DETAILS CARD -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; margin-bottom: 28px; border-collapse: separate;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <!-- TASK NAME -->
                      <tr>
                        <td style="padding-bottom: 12px; vertical-align: top; width: 120px;">
                          <span style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Task Name</span>
                        </td>
                        <td style="padding-bottom: 12px; font-size: 15px; font-weight: 600; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                          {task_name}
                        </td>
                      </tr>
                      <!-- PROJECT -->
                      <tr>
                        <td style="padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Project</span>
                        </td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                          {project_name}
                        </td>
                      </tr>
                      <!-- PRIORITY -->
                      <tr>
                        <td style="padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Priority</span>
                        </td>
                        <td style="padding-bottom: 12px; vertical-align: middle;">
                          {priority_badge}
                        </td>
                      </tr>
                      <!-- DUE DATE -->
                      <tr>
                        <td style="padding-bottom: 0; vertical-align: top;">
                          <span style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Due Date</span>
                        </td>
                        <td style="padding-bottom: 0; font-size: 15px; color: #334155; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                          {due_date_display}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- DESCRIPTION -->
              <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Description</h3>
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #334155; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">{task_description}</p>
              </div>

              <!-- CTA BUTTON -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <a href="{dashboard_url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      View Task on Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; line-height: 18px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Assigned by <strong>{admin_name}</strong> ({admin_email}).
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 18px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                If you have any questions, please reply directly to this email to contact the assigner.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                &copy; 2026 Task Management Portal. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def format_date(d):
    """Formats a datetime.date object to a professional string format."""
    if not d:
        return ""
    try:
        return d.strftime("%B %d, %Y")
    except Exception:
        return str(d)

def send_task_notification_email_async(task, admin_user, assignees):
    """
    Sends a task assignment notification email asynchronously to all assignees
    individually using Django's SMTP backend.
    """
    # Filter assignees that have email addresses
    valid_assignees = [a for a in assignees if getattr(a, 'email', None)]
    
    if not valid_assignees:
        logger.warning(f"No valid assignee emails found for task: {task.task_name}. Skipping email dispatch.")
        return

    def run():
        # Get verified from email address from settings/env
        from_email_address = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or os.getenv("DEFAULT_FROM_EMAIL", "navithkumar.wyzmindz@gmail.com")
        
        # Get admin details, falling back to username if user_name is empty string or None
        admin_name = (getattr(admin_user, 'user_name', '') or getattr(admin_user, 'username', '') or 'Admin').strip()
        admin_email = getattr(admin_user, 'email', '')
        
        # Format dates
        orig_due_str = format_date(task.due_date)
        rev_due_str = format_date(task.revised_due_date)
        
        # Construct priority badge HTML
        priority = str(task.priority).upper()
        if priority == "HIGH":
            priority_badge = (
                '<span style="background-color: #ef4444; color: #ffffff; padding: 4px 10px; '
                'border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; '
                'letter-spacing: 0.05em; display: inline-block; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">High</span>'
            )
        elif priority == "LOW":
            priority_badge = (
                '<span style="background-color: #10b981; color: #ffffff; padding: 4px 10px; '
                'border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; '
                'letter-spacing: 0.05em; display: inline-block; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">Low</span>'
            )
        else: # MEDIUM
            priority_badge = (
                '<span style="background-color: #f59e0b; color: #ffffff; padding: 4px 10px; '
                'border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; '
                'letter-spacing: 0.05em; display: inline-block; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">Medium</span>'
            )
            
        # Construct due date display HTML
        if task.revised_due_date:
            due_date_display = (
                f'<span><span style="text-decoration: line-through; color: #94a3b8; margin-right: 8px;">{html.escape(orig_due_str)}</span>'
                f'<span style="color: #ef4444; font-weight: 600;">{html.escape(rev_due_str)} (Revised)</span></span>'
            )
        else:
            due_date_display = f'<span style="color: #334155;">{html.escape(orig_due_str)}</span>'
            
        # Get dashboard base URL dynamically from settings or environment
        frontend_url = getattr(settings, 'FRONTEND_URL', None) or os.getenv("FRONTEND_URL", "http://localhost:5174")
        frontend_url = frontend_url.rstrip('/')
        dashboard_url = f"{frontend_url}/tasks"
        
        # Prepare escaped task details
        task_name_esc = html.escape(task.task_name)
        project_name_esc = html.escape(task.project_name)
        task_desc_esc = html.escape(task.description or "")
        admin_name_esc = html.escape(admin_name)
        admin_email_esc = html.escape(admin_email)
        
        subject = f"New Task Assigned: {task.task_name}"
        
        # Construct RFC-822 formatted 'from' header (e.g. "Admin Name via Task Portal <verified_email@domain.com>")
        from_header = f"{admin_name} via Task Portal <{from_email_address}>"
        
        # Loop through assignees and send personalized emails
        for assignee in valid_assignees:
            try:
                # Fall back to username if user_name is empty string or None
                assignee_name = (getattr(assignee, 'user_name', '') or getattr(assignee, 'username', '') or 'Team Member').strip()
                assignee_email = assignee.email
                
                # Render HTML template for this assignee
                html_body = EMAIL_HTML_TEMPLATE.format(
                    assignee_name=html.escape(assignee_name),
                    admin_name=admin_name_esc,
                    admin_email=admin_email_esc,
                    task_name=task_name_esc,
                    project_name=project_name_esc,
                    priority_badge=priority_badge,
                    due_date_display=due_date_display,
                    task_description=task_desc_esc,
                    dashboard_url=dashboard_url
                )
                
                # Generate plain text version for client fallback & spam filter safety
                text_due_str = f"Due Date: {orig_due_str}"
                if task.revised_due_date:
                    text_due_str = f"Due Date: {orig_due_str} (Revised to: {rev_due_str})"
                    
                text_body = (
                    f"Hello {assignee_name},\n\n"
                    f"You have been assigned to a new task by {admin_name}.\n\n"
                    f"Task Details:\n"
                    f"--------------\n"
                    f"Task Name: {task.task_name}\n"
                    f"Project: {task.project_name}\n"
                    f"Priority: {task.priority}\n"
                    f"{text_due_str}\n\n"
                    f"Description:\n"
                    f"{task.description or ''}\n\n"
                    f"You can view this task on your dashboard at:\n"
                    f"{dashboard_url}\n\n"
                    f"Assigned by: {admin_name} ({admin_email})\n\n"
                    f"Best regards,\n"
                    f"Task Management System"
                )
                
                # Construct Django SMTP EmailMultiAlternatives instance
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=text_body,
                    from_email=from_header,
                    to=[assignee_email],
                    reply_to=[admin_email] if admin_email else None
                )
                # Attach HTML alternative
                msg.attach_alternative(html_body, "text/html")
                
                # Dispatch email via SMTP
                msg.send(fail_silently=False)
                logger.info(f"Task notification email sent successfully via SMTP to {assignee_email}")
                
            except Exception as e:
                logger.error(f"Failed to send email via SMTP to {getattr(assignee, 'email', 'Unknown')}: {str(e)}")

    # Run in a background thread to prevent blocking the API response
    threading.Thread(target=run).start()
