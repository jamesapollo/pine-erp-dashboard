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
