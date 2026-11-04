import { z } from 'zod';

import { SOCIAL_NETWORKS, type ContactDetails, type SocialNetwork } from '@/types/contactDetails';

export const MAX_TOPICS = 10;
export const MAX_TOPIC_LENGTH = 40;

export function isDuplicateTopic(topics: string[], name: string): boolean {
  return topics.some((topic) => topic.toLowerCase() === name.toLowerCase());
}

const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const PHONE_MESSAGE = 'Use international format, e.g. +254700000000';
const HTTPS_MESSAGE = 'Use a link starting with https://';

// Each scalar is optional: an empty box means "not set" and is sent as null.
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} can be up to ${max} characters.`);

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || PHONE_PATTERN.test(value), PHONE_MESSAGE);

const optionalHttpsLink = z
  .string()
  .trim()
  .max(255, 'Links can be up to 255 characters.')
  .refine((value) => {
    if (value === '') return true;
    try {
      return new URL(value).protocol === 'https:' && /^https:\/\//i.test(value);
    } catch {
      return false;
    }
  }, HTTPS_MESSAGE);

export const contactDetailsSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, 'Email can be up to 254 characters.')
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'Enter a valid email.',
    ),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  address_line: optionalText(200, 'Address'),
  city: optionalText(100, 'City'),
  country_code: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[A-Za-z]{2}$/.test(value),
      'Use a 2-letter country code, e.g. KE',
    ),
  opening_hours: optionalText(120, 'Opening hours'),
  visit_note: optionalText(120, 'Visit note'),
  social_links: z.object({
    instagram: optionalHttpsLink,
    tiktok: optionalHttpsLink,
    pinterest: optionalHttpsLink,
    facebook: optionalHttpsLink,
    x: optionalHttpsLink,
    youtube: optionalHttpsLink,
  }),
  enquiry_topics: z.array(z.string()).max(MAX_TOPICS, `Add up to ${MAX_TOPICS} topics.`),
});

export type ContactDetailsInput = z.infer<typeof contactDetailsSchema>;

function toText(value: string | null): string {
  return value ?? '';
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function toContactDetailsInput(details: ContactDetails): ContactDetailsInput {
  const socialLinks = Object.fromEntries(
    SOCIAL_NETWORKS.map((network) => [network, toText(details.social_links[network])]),
  ) as Record<SocialNetwork, string>;
  return {
    email: toText(details.email),
    phone: toText(details.phone),
    whatsapp: toText(details.whatsapp),
    address_line: toText(details.address_line),
    city: toText(details.city),
    country_code: toText(details.country_code),
    opening_hours: toText(details.opening_hours),
    visit_note: toText(details.visit_note),
    social_links: socialLinks,
    enquiry_topics: details.enquiry_topics,
  };
}

// The PUT is a full replace: every key is sent, and an empty box clears the field.
export function toContactDetailsBody(values: ContactDetailsInput): ContactDetails {
  const country = toNullable(values.country_code);
  return {
    email: toNullable(values.email),
    phone: toNullable(values.phone),
    whatsapp: toNullable(values.whatsapp),
    address_line: toNullable(values.address_line),
    city: toNullable(values.city),
    country_code: country === null ? null : country.toUpperCase(),
    opening_hours: toNullable(values.opening_hours),
    visit_note: toNullable(values.visit_note),
    social_links: Object.fromEntries(
      SOCIAL_NETWORKS.map((network) => [network, toNullable(values.social_links[network])]),
    ) as Record<SocialNetwork, string | null>,
    enquiry_topics: values.enquiry_topics,
  };
}

/** "+254… · hello@… · Nairobi, KE": the parts that are set, in that order. */
export function formatContactPreview(values: ContactDetailsInput): string {
  const place = [values.city.trim(), values.country_code.trim().toUpperCase()]
    .filter((part) => part !== '')
    .join(', ');
  return [values.phone.trim(), values.email.trim(), place]
    .filter((part) => part !== '')
    .join(' · ');
}
