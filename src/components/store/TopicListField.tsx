import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';

import { MAX_TOPIC_LENGTH, MAX_TOPICS } from '@/components/store/contactDetailsSchema';
import { Button } from '@/components/ui/Button';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { moveItem } from '@/utils/reorder';

// An ordered list of short topic names, edited with Move up / Move down buttons.
export function TopicListField({
  topics,
  onChange,
  disabled = false,
  error,
}: {
  topics: string[];
  onChange: (topics: string[]) => void;
  /** Read-only: the list shows, but nothing can be added, moved or removed. */
  disabled?: boolean;
  error?: string;
}) {
  const errorId = useId();
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | undefined>(undefined);
  const isFull = topics.length >= MAX_TOPICS;

  function add() {
    const name = draft.trim();
    if (name === '') return;
    if (topics.some((topic) => topic.toLowerCase() === name.toLowerCase())) {
      setDraftError('That topic is already in the list');
      return;
    }
    onChange([...topics, name]);
    setDraft('');
    setDraftError(undefined);
  }

  return (
    <div className="flex flex-col gap-3">
      {topics.length === 0 ? (
        <p className="m-0 text-sm text-text-tertiary">No topics yet.</p>
      ) : (
        <ol aria-label="Enquiry topics" className="m-0 flex list-none flex-col gap-1 p-0">
          {topics.map((topic, index) => (
            <li
              key={topic}
              className="flex items-center gap-1 rounded-control border border-border-subtle px-3 py-1.5"
            >
              <span data-topic-name className="min-w-0 flex-1 truncate text-sm font-medium">
                {topic}
              </span>
              {disabled ? null : (
                <>
                  <IconButton
                    size="sm"
                    icon={ArrowUp}
                    label={`Move ${topic} up`}
                    disabled={index === 0}
                    onClick={() => onChange(moveItem(topics, index, index - 1))}
                  />
                  <IconButton
                    size="sm"
                    icon={ArrowDown}
                    label={`Move ${topic} down`}
                    disabled={index === topics.length - 1}
                    onClick={() => onChange(moveItem(topics, index, index + 1))}
                  />
                  <IconButton
                    size="sm"
                    icon={X}
                    label={`Remove ${topic}`}
                    onClick={() => onChange(topics.filter((_, position) => position !== index))}
                  />
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      {disabled ? null : (
        <div className="flex items-start gap-2">
          <Input
            label="New topic"
            className="flex-1"
            maxLength={MAX_TOPIC_LENGTH}
            value={draft}
            disabled={isFull}
            hint={isFull ? `You can add up to ${MAX_TOPICS} topics.` : undefined}
            error={draftError}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftError(undefined);
            }}
            onKeyDown={(event) => {
              // Enter adds the topic instead of submitting the whole form.
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
          />
          <Button
            variant="secondary"
            className="mt-[22px]"
            disabled={isFull || draft.trim() === ''}
            onClick={add}
          >
            <Plus size={16} aria-hidden />
            Add topic
          </Button>
        </div>
      )}
      <FormErrorMessage id={errorId} message={error} />
    </div>
  );
}
