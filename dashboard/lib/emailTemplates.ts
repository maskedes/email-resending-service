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
];
