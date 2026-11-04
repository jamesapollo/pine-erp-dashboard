export type EnquiryStatus = 'new' | 'replied' | 'closed';

export type Enquiry = {
  id: number;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  status: EnquiryStatus;
  last_replied_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type ReplyMailStatus = 'queued' | 'sent' | 'failed';

export type EnquiryReply = {
  id: number;
  author_name: string | null;
  body: string;
  mail_status: ReplyMailStatus;
  sent_at: string | null;
  created_at: string;
};

export type EnquiryDetail = Enquiry & { replies: EnquiryReply[] };
