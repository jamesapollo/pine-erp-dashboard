export const SOCIAL_NETWORKS = [
  'instagram',
  'tiktok',
  'pinterest',
  'facebook',
  'x',
  'youtube',
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

// Mirrors GET/PUT stores/{store}/contact-details. Every scalar is nullable; a PUT sends every key.
export type ContactDetails = {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_line: string | null;
  city: string | null;
  country_code: string | null;
  opening_hours: string | null;
  visit_note: string | null;
  social_links: Record<SocialNetwork, string | null>;
  enquiry_topics: string[];
};
