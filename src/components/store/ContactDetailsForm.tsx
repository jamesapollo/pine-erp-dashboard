import { useState, type FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';

import { type ValidationErrorBody } from '@/types/apiErrors';
import { type ContactDetails } from '@/types/contactDetails';
import { useUpdateContactDetailsMutation } from '@/hooks/api/mutations/store/useUpdateContactDetailsMutation';
import {
  contactDetailsSchema,
  MAX_TOPIC_LENGTH,
  MAX_TOPICS,
  formatContactPreview,
  toContactDetailsBody,
  toContactDetailsInput,
  type ContactDetailsInput,
} from '@/components/store/contactDetailsSchema';
import { isDuplicateTopic, TopicListField } from '@/components/store/TopicListField';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getActionErrorMessage, isStatus } from '@/utils/apiErrors';

const FIELD_PATTERN =
  /^(email|phone|whatsapp|address_line|city|country_code|opening_hours|visit_note|social_links\.(instagram|tiktok|pinterest|facebook|x|youtube)|enquiry_topics)$/;

// The API names fields like "enquiry_topics.2"; the form shows that error on the whole topic list.
function getServerFieldErrors(error: unknown): [FieldPath<ContactDetailsInput>, string][] {
  if (!isStatus(error, 422) || !isAxiosError<Partial<ValidationErrorBody>>(error)) return [];
  const found: [FieldPath<ContactDetailsInput>, string][] = [];
  for (const [key, messages] of Object.entries(error.response?.data?.errors ?? {})) {
    const path = key.replace(/^(enquiry_topics)\.\d+$/, '$1');
    if (FIELD_PATTERN.test(path) && messages[0]) {
      found.push([path as FieldPath<ContactDetailsInput>, messages[0]]);
    }
  }
  return found;
}

export function ContactDetailsForm({
  details,
  canManage,
}: {
  details: ContactDetails;
  canManage: boolean;
}) {
  const updateMutation = useUpdateContactDetailsMutation();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ContactDetailsInput>({
    resolver: zodResolver(contactDetailsSchema),
    mode: 'onSubmit',
    defaultValues: toContactDetailsInput(details),
  });
  const values = useWatch({ control });
  const preview = formatContactPreview(values as ContactDetailsInput);
  const disabled = !canManage;

  const [topicDraft, setTopicDraft] = useState('');
  const [topicDraftError, setTopicDraftError] = useState<string | undefined>(undefined);

  const submitValidInput = handleSubmit((input) => {
    updateMutation.mutate(toContactDetailsBody(input), {
      onSuccess: (saved) => reset(toContactDetailsInput(saved)),
      onError: (error) => {
        for (const [path, message] of getServerFieldErrors(error)) setError(path, { message });
      },
    });
  });

  // A topic typed but not added yet is added on Save if it is valid; otherwise Save waits.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const name = topicDraft.trim();
    if (name !== '') {
      const topics = getValues('enquiry_topics');
      if (
        name.length > MAX_TOPIC_LENGTH ||
        topics.length >= MAX_TOPICS ||
        isDuplicateTopic(topics, name)
      ) {
        event.preventDefault();
        setTopicDraftError('Add or clear the new topic first');
        return;
      }
      setValue('enquiry_topics', [...topics, name]);
      setTopicDraft('');
    }
    void submitValidInput(event);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex max-w-[720px] flex-col gap-4">
      {updateMutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(updateMutation.error)}</Alert>
      ) : null}
      <Card title="Contact" subtitle="How customers reach the store.">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            autoComplete="off"
            disabled={disabled}
            hint="Customers' answers to your replies go here."
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone"
            type="tel"
            autoComplete="off"
            placeholder="+254700000000"
            disabled={disabled}
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="WhatsApp"
            type="tel"
            autoComplete="off"
            placeholder="+254700000000"
            disabled={disabled}
            hint="The website links to this number on WhatsApp."
            error={errors.whatsapp?.message}
            {...register('whatsapp')}
          />
        </div>
      </Card>
      <Card title="Visit" subtitle="Where and when customers can find you.">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Address line"
            className="sm:col-span-2"
            disabled={disabled}
            error={errors.address_line?.message}
            {...register('address_line')}
          />
          <Input
            label="City"
            disabled={disabled}
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Country code"
            placeholder="KE"
            maxLength={2}
            disabled={disabled}
            error={errors.country_code?.message}
            {...register('country_code')}
          />
          <Input
            label="Opening hours"
            placeholder="Mon – Sat, 9am – 6pm EAT"
            disabled={disabled}
            error={errors.opening_hours?.message}
            {...register('opening_hours')}
          />
          <Input
            label="Visit note"
            placeholder="By appointment only"
            disabled={disabled}
            error={errors.visit_note?.message}
            {...register('visit_note')}
          />
        </div>
      </Card>
      <Card title="Social links" subtitle="Links must start with https://.">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Instagram"
            disabled={disabled}
            error={errors.social_links?.instagram?.message}
            {...register('social_links.instagram')}
          />
          <Input
            label="TikTok"
            disabled={disabled}
            error={errors.social_links?.tiktok?.message}
            {...register('social_links.tiktok')}
          />
          <Input
            label="Pinterest"
            disabled={disabled}
            error={errors.social_links?.pinterest?.message}
            {...register('social_links.pinterest')}
          />
          <Input
            label="Facebook"
            disabled={disabled}
            error={errors.social_links?.facebook?.message}
            {...register('social_links.facebook')}
          />
          <Input
            label="X"
            disabled={disabled}
            error={errors.social_links?.x?.message}
            {...register('social_links.x')}
          />
          <Input
            label="YouTube"
            disabled={disabled}
            error={errors.social_links?.youtube?.message}
            {...register('social_links.youtube')}
          />
        </div>
      </Card>
      <Card
        title="Enquiry topics"
        subtitle="The choices on the website's contact form, in order. Up to 10."
      >
        <Controller
          control={control}
          name="enquiry_topics"
          render={({ field }) => (
            <TopicListField
              topics={field.value}
              onChange={field.onChange}
              draft={topicDraft}
              draftError={topicDraftError}
              onDraftChange={(draft, draftError) => {
                setTopicDraft(draft);
                setTopicDraftError(draftError);
              }}
              disabled={disabled}
              error={errors.enquiry_topics?.message}
            />
          )}
        />
      </Card>
      <Card
        title="Preview"
        footer={
          canManage ? (
            <>
              <span className="mr-auto text-[13px] text-text-tertiary">
                Changes show on the website within about 5 minutes.
              </span>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Save
              </Button>
            </>
          ) : undefined
        }
      >
        {preview === '' ? (
          <p className="m-0 text-sm text-text-tertiary">Nothing to show yet.</p>
        ) : (
          <p className="m-0 text-sm text-text-primary">{preview}</p>
        )}
      </Card>
      {canManage ? null : (
        <p className="m-0 text-[13px] text-text-tertiary">
          You can view these details. Only the owner can change them.
        </p>
      )}
    </form>
  );
}
