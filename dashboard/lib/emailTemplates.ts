// Built-in, read-only email template library.
// These are NOT stored in the database (per-API-key) — they are a static
// starter library shown in the email composer so users can quickly load a
// professionally written template and customize it.

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

/**
 * Converts a plain-text template body into a simple HTML version
 * (paragraphs from blank lines, <br/> for single line breaks).
 */
export function templateBodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'general-intro',
    name: 'General Professional Introduction',
    subject: 'Introduction – [Your Name] from [Company/Organization]',
    body: `Dear [Recipient Name],

I hope you are doing well. My name is [Your Name], and I am [your position/role] at [Company/Organization].

I am reaching out to introduce myself and explore potential opportunities for collaboration regarding [topic/project/service].

I would be pleased to discuss this with you further and learn more about your current needs.

Kind regards,
[Your Full Name]
[Job Title]
[Company]
[Phone Number]
[Email Address]
[Website]`,
  },
  {
    id: 'business-proposal',
    name: 'Business Proposal',
    subject: 'Proposal for [Project/Service Name]',
    body: `Dear [Recipient Name],

I am writing to present a proposal regarding [brief description of project/service].

Our proposed solution is designed to [main benefit or objective]. We believe this could help [Company/Organization] achieve [specific outcome].

I have included the relevant details for your consideration. Please let me know a convenient time to discuss the proposal and any questions you may have.

Thank you for your time and consideration.

Kind regards,
[Your Name]
[Company]
[Contact Information]`,
  },
  {
    id: 'meeting-request',
    name: 'Meeting Request',
    subject: 'Meeting Request – [Topic]',
    body: `Dear [Recipient Name],

I would like to request a meeting to discuss [topic/project].

Would you be available on [date] at [time]? I am also happy to accommodate another time that works better for your schedule.

The purpose of the meeting would be to discuss [brief agenda].

I look forward to hearing from you.

Best regards,
[Your Name]`,
  },
  {
    id: 'follow-up',
    name: 'Follow-Up After No Response',
    subject: 'Following Up – [Previous Subject/Topic]',
    body: `Dear [Recipient Name],

I hope you are well.

I am following up regarding my previous email concerning [topic]. I understand you may have a busy schedule, so I wanted to check whether you had an opportunity to review my message.

Please let me know if you require any additional information from me.

I look forward to your response.

Kind regards,
[Your Name]`,
  },
  {
    id: 'customer-support',
    name: 'Customer Support Response',
    subject: 'Re: Support Request – [Issue]',
    body: `Dear [Customer Name],

Thank you for contacting [Company Name].

We have reviewed your request regarding [issue]. We understand the inconvenience this may have caused and appreciate your patience.

Our team is currently [investigating/resolving/reviewing] the issue. We will provide you with an update as soon as further information is available.

Please let us know if you have any additional details that may help us resolve the matter.

Best regards,
[Your Name]
[Support Team]
[Company Name]`,
  },
  {
    id: 'complaint-response',
    name: 'Complaint Response',
    subject: 'Response to Your Complaint – [Reference Number]',
    body: `Dear [Customer Name],

Thank you for bringing this matter to our attention.

We sincerely apologize for the inconvenience you experienced regarding [issue]. We take your concerns seriously and have reviewed the situation.

We are taking the following steps to address the matter: [brief explanation].

We appreciate your patience and the opportunity to resolve this issue.

Sincerely,
[Your Name]
[Position]
[Company]`,
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    subject: 'Payment Reminder – Invoice [Invoice Number]',
    body: `Dear [Recipient Name],

I hope you are well.

This is a friendly reminder that invoice [Invoice Number], issued on [Date], remains outstanding in the amount of [Amount].

The payment due date was [Due Date]. Please arrange payment at your earliest convenience.

Should you have already made the payment, please disregard this message or send us the payment confirmation for our records.

Thank you.

Kind regards,
[Your Name]
[Company]
[Payment Details]`,
  },
  {
    id: 'invoice-submission',
    name: 'Invoice Submission',
    subject: 'Invoice [Invoice Number] – [Company Name]',
    body: `Dear [Recipient Name],

Please find attached invoice [Invoice Number] for [product/service/project].

Invoice Amount: [Amount]
Payment Due Date: [Date]

Please review the invoice and let me know if you require any clarification or additional documentation.

Thank you for your business.

Best regards,
[Your Name]
[Company Name]`,
  },
  {
    id: 'job-application',
    name: 'Job Application',
    subject: 'Application for [Job Title] – [Your Name]',
    body: `Dear Hiring Manager,

I am writing to express my interest in the [Job Title] position at [Company Name].

I have experience in [relevant field/skills], and I believe my background and abilities would allow me to contribute effectively to your team.

I have attached my CV/resume for your consideration. I would welcome the opportunity to discuss my qualifications further.

Thank you for considering my application.

Kind regards,
[Your Full Name]
[Phone Number]
[Email Address]
[LinkedIn/Portfolio]`,
  },
  {
    id: 'interview-thank-you',
    name: 'Job Interview Thank You',
    subject: 'Thank You – [Job Title] Interview',
    body: `Dear [Interviewer Name],

Thank you for taking the time to meet with me regarding the [Job Title] position.

I appreciated the opportunity to learn more about [Company Name], the team, and the role. Our discussion strengthened my interest in the position.

Please do not hesitate to contact me if you require any additional information.

Thank you again for your time and consideration.

Best regards,
[Your Name]`,
  },
  {
    id: 'request-info',
    name: 'Request for Information',
    subject: 'Request for Information – [Topic]',
    body: `Dear [Recipient Name],

I hope you are doing well.

I am contacting you to request additional information regarding [product/service/project/topic].

Specifically, I would appreciate information about:

- [Item 1]
- [Item 2]
- [Item 3]
Please let me know if you need any additional details from me.

Thank you for your assistance.

Kind regards,
[Your Name]`,
  },
  {
    id: 'partnership',
    name: 'Partnership Request',
    subject: 'Partnership Opportunity – [Company Name]',
    body: `Dear [Recipient Name],

I am reaching out on behalf of [Company Name] to explore a potential partnership with [Recipient's Company].

We believe there may be strong opportunities for collaboration in [industry/area]. Our goal would be to [briefly describe proposed partnership].

I would appreciate the opportunity to discuss this further and explore whether our organizations could work together.

Kind regards,
[Your Name]
[Position]
[Company]`,
  },
  {
    id: 'tech-issue',
    name: 'Technical Issue Report',
    subject: 'Technical Issue Report – [System/Product]',
    body: `Dear [Technical Support Team],

I am writing to report a technical issue affecting [system/application/service].

Issue: [Description]
Date/Time: [Date and Time]
Account/Reference: [Reference]
Expected Result: [Expected behavior]
Actual Result: [What happened]

I have already attempted the following troubleshooting steps: [steps taken].

Please investigate the issue and advise on the recommended resolution.

Thank you for your assistance.

Best regards,
[Your Name]`,
  },
  {
    id: 'dns-support',
    name: 'Domain/DNS Support Request',
    subject: 'DNS Configuration Support – [Domain Name]',
    body: `Dear [Provider/Support Team],

I am contacting you regarding the DNS configuration for [domain.com].

I am currently experiencing the following issue: [describe issue].

The current configuration includes:

Nameservers: [Nameservers]
DNS Records: [Relevant records]
Error/Message: [Error message]

Could you please review the configuration and advise whether any changes are required?

Thank you for your assistance.

Kind regards,
[Your Name]`,
  },
  {
    id: 'account-upgrade',
    name: 'Request for Account Upgrade',
    subject: 'Request for Account Limit Increase',
    body: `Dear [Support Team],

I am writing to request an increase to the current limits on my [account/service].

My current usage is approximately [usage], and I require additional capacity for [reason].

The requested limit is [new limit].

Please let me know whether this increase can be approved and whether you require any additional information from me.

Thank you for your consideration.

Kind regards,
[Your Name]
[Account/Organization Name]`,
  },
  {
    id: 'project-update',
    name: 'Project Status Update',
    subject: 'Project Update – [Project Name]',
    body: `Dear [Recipient Name],

I would like to provide a brief update regarding [Project Name].

Completed:
[Completed tasks]

Currently in progress:
[Current tasks]

Upcoming:
[Next steps]

Current status:
[On schedule / Delayed / Awaiting approval]

At this stage, we expect [expected completion/date or milestone].

Please let me know if you would like any additional details.

Kind regards,
[Your Name]`,
  },
  {
    id: 'approval-request',
    name: 'Request for Approval',
    subject: 'Approval Required – [Project/Request]',
    body: `Dear [Recipient Name],

I am writing to request your approval for [project/request/change].

The proposed action is intended to [purpose/benefit].

Requested action: [Action]
Estimated cost: [Amount]
Expected completion: [Date]

Please review the request and confirm whether we may proceed.

Thank you.

Kind regards,
[Your Name]`,
  },
  {
    id: 'apology',
    name: 'Professional Apology',
    subject: 'Apology Regarding [Issue]',
    body: `Dear [Recipient Name],

Please accept my sincere apologies regarding [issue].

We recognize that [brief explanation of impact], and we understand the inconvenience this may have caused.

We are taking steps to prevent the issue from occurring again, including [action taken].

Thank you for your understanding and patience.

Sincerely,
[Your Name]
[Position]
[Company]`,
  },
  {
    id: 'service-cancellation',
    name: 'Service Cancellation',
    subject: 'Request to Cancel [Service/Subscription]',
    body: `Dear [Support Team],

I am writing to request cancellation of my [service/subscription/account], associated with [account/email/reference].

Please process the cancellation effective [date], in accordance with your applicable terms.

Kindly confirm once the cancellation has been completed and advise whether any further action is required from me.

Thank you for your assistance.

Kind regards,
[Your Name]`,
  },
  {
    id: 'business-inquiry',
    name: 'Formal Business Inquiry',
    subject: 'Business Inquiry – [Company/Service/Product]',
    body: `Dear [Recipient Name],

I am contacting you regarding [specific product, service, opportunity, or business matter].

I would appreciate further information concerning [specific questions or requirements].

In particular, I would like to know about:

- Pricing and available plans
- Terms and conditions
- Technical or service requirements
- Availability and implementation process
Please provide the relevant information at your earliest convenience.

Thank you for your time. I look forward to your response.

Kind regards,
[Your Full Name]
[Position/Company]
[Phone Number]
[Email Address]`,
  },

  // ─── Transactional & authentication templates ({{variable}} placeholders) ───
  {
    id: 'welcome-email',
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}!',
    body: `Hi {{first_name}},

Welcome to {{company_name}}! 🎉

We're excited to have you here. Your account has been successfully created, and you're ready to get started.

Here's what you can do next:
- Explore our features.
- Customize your profile.
- Discover everything we have to offer.

Ready to begin? Get started here: {{start_url}}

If you need help, our support team is here for you.

Best regards,
The {{company_name}} Team`,
  },
  {
    id: 'email-verification',
    name: 'Email Verification',
    subject: 'Verify your email address',
    body: `Hi {{first_name}},

Please verify your email address to complete your registration with {{company_name}}.

Click the button below to confirm that this email address belongs to you.

Verify email address: {{verification_url}}

This verification link expires in {{expiry_time}}.

If you didn't create an account with us, you can safely ignore this email.

Thanks,
The {{company_name}} Team`,
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    subject: 'Reset your password',
    body: `Hi {{first_name}},

We received a request to reset the password for your {{company_name}} account.

Click below to choose a new password.

Reset password: {{reset_url}}

For your security, this link expires in {{expiry_time}}.

If you didn't request a password reset, you can ignore this email. Your password will remain unchanged.

Regards,
The {{company_name}} Security Team`,
  },
  {
    id: 'password-changed',
    name: 'Password Changed Notification',
    subject: 'Your password has been changed',
    body: `Hi {{first_name}},

The password for your {{company_name}} account was successfully changed on {{change_date}} at {{change_time}}.

If you made this change, no further action is required.

If you didn't change your password, secure your account immediately: {{security_url}}

Thank you,
The {{company_name}} Security Team`,
  },
  {
    id: 'two-factor-code',
    name: 'Two-Factor Authentication Code',
    subject: 'Your verification code is {{otp_code}}',
    body: `Hi {{first_name}},

Use the verification code below to complete your sign-in to {{company_name}}.

{{otp_code}}

This code expires in {{expiry_minutes}} minutes.

Never share this code with anyone. Our team will never ask you to disclose it.

If you didn't attempt to sign in, consider securing your account.

The {{company_name}} Security Team`,
  },
  {
    id: 'login-alert',
    name: 'Login Alert',
    subject: 'New sign-in to your account',
    body: `Hi {{first_name}},

We detected a new sign-in to your {{company_name}} account.

Sign-in details:
- Date: {{login_date}}
- Device: {{device_name}}
- Browser: {{browser_name}}
- Approximate location: {{location}}

If this was you, no action is needed.

If you don't recognize this activity, secure your account immediately.

Review account activity: {{activity_url}}

The {{company_name}} Security Team`,
  },
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    subject: 'Order {{order_number}} confirmed!',
    body: `Hi {{first_name}},

Thank you for your order!

We've received your order and are preparing it for processing.

Order details:
- Order number: {{order_number}}
- Order date: {{order_date}}
- Total: {{currency}} {{order_total}}
- Payment status: {{payment_status}}

Items ordered:
{{order_items}}

View your order: {{order_url}}

We'll notify you when your order status changes.

Thank you for shopping with {{company_name}}!

Customer Support Team`,
  },
  {
    id: 'payment-receipt',
    name: 'Payment Receipt',
    subject: 'Payment receipt — {{transaction_id}}',
    body: `Hi {{first_name}},

Your payment was successfully received.

Payment details:
- Transaction ID: {{transaction_id}}
- Amount paid: {{currency}} {{amount}}
- Payment method: {{payment_method}}
- Payment date: {{payment_date}}
- Description: {{payment_description}}

You can view your transaction details below.

View receipt: {{receipt_url}}

Thank you for choosing {{company_name}}.

Finance Team`,
  },
  {
    id: 'failed-payment',
    name: 'Failed Payment',
    subject: 'Action required: Your payment could not be completed',
    body: `Hi {{first_name}},

We couldn't complete your recent payment to {{company_name}}.

Payment details:
- Amount: {{currency}} {{amount}}
- Transaction reference: {{transaction_id}}
- Date: {{payment_date}}

Please check your payment details or try another payment method.

Retry payment: {{retry_url}}

If you've already completed this payment, please contact our support team before trying again.

Regards,
The {{company_name}} Billing Team`,
  },
  {
    id: 'shipping-confirmation',
    name: 'Shipping Confirmation',
    subject: 'Your order is on its way!',
    body: `Hi {{first_name}},

Good news! Your order {{order_number}} has been shipped.

Delivery details:
- Carrier: {{shipping_carrier}}
- Tracking number: {{tracking_number}}
- Estimated delivery: {{estimated_delivery}}

Track your package: {{tracking_url}}

We'll keep you updated as your package makes its way to you.

Thank you for shopping with {{company_name}}.

Delivery Team`,
  },
  {
    id: 'delivery-confirmation',
    name: 'Delivery Confirmation',
    subject: 'Your order has been delivered',
    body: `Hi {{first_name}},

Your order {{order_number}} has been marked as delivered.

Delivery details:
- Delivered on: {{delivery_date}}
- Delivery location: {{delivery_location}}

We hope you enjoy your purchase!

View order: {{order_url}}

If you haven't received your package, please contact our support team.

Thank you for choosing {{company_name}}.`,
  },
  {
    id: 'appointment-confirmation',
    name: 'Appointment Confirmation',
    subject: 'Your appointment is confirmed',
    body: `Hi {{first_name}},

Your appointment with {{company_name}} has been confirmed.

Appointment details:
- Service: {{service_name}}
- Date: {{appointment_date}}
- Time: {{appointment_time}}
- Location: {{appointment_location}}
- Reference: {{appointment_id}}

View appointment: {{appointment_url}}

If you need to make changes, please use the appointment link above.

We look forward to seeing you!

The {{company_name}} Team`,
  },
  {
    id: 'meeting-invitation',
    name: 'Meeting Invitation',
    subject: 'Invitation: {{meeting_title}}',
    body: `Hi {{first_name}},

You're invited to attend the following meeting.

Meeting details:
- Title: {{meeting_title}}
- Date: {{meeting_date}}
- Time: {{meeting_time}}
- Organizer: {{organizer_name}}
- Location: {{meeting_location}}
- Meeting link: {{meeting_url}}

Please confirm your attendance.

Accept invitation: {{rsvp_url}}

We look forward to meeting with you.

Best regards,
{{organizer_name}}`,
  },
  {
    id: 'contact-form-notification',
    name: 'Contact Form Notification',
    subject: 'New inquiry from {{sender_name}}',
    body: `Hello {{recipient_name}},

A new inquiry has been submitted through your website.

Inquiry details:
- Name: {{sender_name}}
- Email: {{sender_email}}
- Subject: {{message_subject}}

Message:

{{message_body}}

Received on: {{submission_date}}

View inquiry: {{inquiry_url}}

Please respond to the sender when convenient.

{{company_name}} Notifications`,
  },
  {
    id: 'support-ticket',
    name: 'Customer Support Ticket',
    subject: 'Support request received — #{{ticket_id}}',
    body: `Hi {{first_name}},

We've received your support request and created a ticket.

Ticket details:
- Ticket number: {{ticket_id}}
- Subject: {{ticket_subject}}
- Priority: {{ticket_priority}}
- Submitted: {{submission_date}}

Your message:

{{ticket_message}}

You can check your ticket status or add more information below.

View support ticket: {{ticket_url}}

Our support team will respond as soon as possible.

The {{company_name}} Support Team`,
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    subject: 'The latest from {{company_name}}',
    body: `Hi {{first_name}},

Here's what's new at {{company_name}}.

Featured update:

{{featured_title}}

{{featured_description}}

Read more: {{featured_url}}

More updates:
- {{article_1_title}}
- {{article_2_title}}
- {{article_3_title}}

Thanks for being part of our community.

Best regards,
The {{company_name}} Team

You're receiving this email because you subscribed to our updates.

Unsubscribe: {{unsubscribe_url}}`,
  },
  {
    id: 'promotional-offer',
    name: 'Promotional Offer',
    subject: 'Special offer: Save {{discount_percentage}}% today!',
    body: `Hi {{first_name}},

We've got something special for you!

Enjoy {{discount_percentage}}% off {{product_or_service}} for a limited time.

Your offer:
- Discount: {{discount_percentage}}%
- Promo code: {{promo_code}}
- Valid until: {{offer_expiry}}

Use your code at checkout to claim your discount.

Shop now: {{shop_url}}

Don't miss out!

The {{company_name}} Team

Offer terms and conditions apply.

Unsubscribe: {{unsubscribe_url}}`,
  },
  {
    id: 'subscription-renewal',
    name: 'Subscription Renewal Reminder',
    subject: 'Your {{company_name}} subscription renews soon',
    body: `Hi {{first_name}},

This is a reminder that your {{plan_name}} subscription is scheduled to renew soon.

Subscription details:
- Plan: {{plan_name}}
- Renewal date: {{renewal_date}}
- Renewal amount: {{currency}} {{renewal_amount}}
- Payment method: {{payment_method}}

Manage subscription: {{subscription_url}}

If you want to change or cancel your subscription, please review your subscription settings before the renewal date.

Thank you for being a customer.

The {{company_name}} Billing Team`,
  },
  {
    id: 'feedback-request',
    name: 'Feedback Request',
    subject: 'How was your experience with {{company_name}}?',
    body: `Hi {{first_name}},

Thank you for choosing {{company_name}}!

We'd love to hear about your experience. Your feedback helps us improve our products and services.

How would you rate your experience?

⭐ 1 Star: {{rating_1_url}}
⭐⭐ 2 Stars: {{rating_2_url}}
⭐⭐⭐ 3 Stars: {{rating_3_url}}
⭐⭐⭐⭐ 4 Stars: {{rating_4_url}}
⭐⭐⭐⭐⭐ 5 Stars: {{rating_5_url}}

Your feedback is appreciated and will help us serve you better.

Thank you,
The {{company_name}} Team`,
  },
  {
    id: 'account-deletion',
    name: 'Account Deletion Confirmation',
    subject: 'Your {{company_name}} account has been deleted',
    body: `Hi {{first_name}},

This email confirms that your {{company_name}} account was deleted on {{deletion_date}}.

We're sorry to see you go.

Account details:
- Account email: {{email_address}}
- Deletion date: {{deletion_date}}
- Reference: {{deletion_reference}}

If you didn't request this deletion, contact our support team immediately.

You may be able to restore your account within {{recovery_period}}. Contact support for details.

Thank you for being part of {{company_name}}.

The {{company_name}} Team`,
  },
];
