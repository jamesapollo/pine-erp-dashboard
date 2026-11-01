import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { ImagePlus, Upload, X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_REJECTED_MESSAGE,
  isAcceptedImage,
  MAXIMUM_PRODUCT_IMAGES,
  type ProductNewInput,
} from '@/components/products/productNewSchema';
import { cn } from '@/utils/cn';

type PendingImage = { id: number; file: File; previewUrl: string };

// Picked images stay in the page and are uploaded after the product is created.
export function PendingImages() {
  const { setValue } = useFormContext<ProductNewInput>();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string>();
  const pendingImagesRef = useRef(pendingImages);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  });

  useEffect(
    () => () => {
      for (const image of pendingImagesRef.current) URL.revokeObjectURL(image.previewUrl);
    },
    [],
  );

  function update(nextImages: PendingImage[]) {
    setPendingImages(nextImages);
    setValue(
      'images',
      nextImages.map((image) => image.file),
      { shouldDirty: true },
    );
  }

  function addFiles(files: File[]) {
    const accepted = files.filter(isAcceptedImage);
    const room = MAXIMUM_PRODUCT_IMAGES - pendingImages.length;
    const added = accepted.slice(0, Math.max(room, 0)).map((file) => ({
      id: nextId.current++,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    if (accepted.length < files.length) setError(IMAGE_REJECTED_MESSAGE);
    else if (added.length < accepted.length) setError('A product can have at most 20 images.');
    else setError(undefined);
    if (added.length > 0) update([...pendingImages, ...added]);
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  function remove(image: PendingImage) {
    URL.revokeObjectURL(image.previewUrl);
    setError(undefined);
    update(pendingImages.filter((candidate) => candidate.id !== image.id));
  }

  const openPicker = () => inputRef.current?.click();
  const isFull = pendingImages.length >= MAXIMUM_PRODUCT_IMAGES;

  return (
    <Card
      title="Images"
      subtitle="First image is the storefront thumbnail"
      actions={
        <Button variant="secondary" size="sm" disabled={isFull} onClick={openPicker}>
          <Icon icon={Upload} size={14} />
          Upload
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        aria-label="Upload images"
        className="sr-only"
        tabIndex={-1}
        onChange={handlePick}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
        {pendingImages.map((image, index) => (
          <div
            key={image.id}
            className={cn(
              'relative aspect-square overflow-hidden rounded-control bg-neutral-100',
              index === 0 ? 'border-2 border-brand-600' : 'border border-border-subtle',
            )}
          >
            <img src={image.previewUrl} alt={image.file.name} className="size-full object-cover" />
            {index === 0 ? (
              <span className="absolute left-1.5 top-1.5">
                <Badge tone="info" size="sm">
                  Cover
                </Badge>
              </span>
            ) : null}
            <IconButton
              icon={X}
              label={`Remove ${image.file.name}`}
              size="sm"
              className="absolute right-1 top-1 bg-surface-card shadow-xs"
              onClick={() => remove(image)}
            />
          </div>
        ))}
        {isFull ? null : (
          <button
            type="button"
            onClick={openPicker}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control border border-dashed border-border-strong bg-transparent p-2 text-center text-[13px] font-medium leading-[1.3] text-text-secondary focus-visible:shadow-focus focus-visible:outline-none"
          >
            <Icon icon={ImagePlus} size={20} />
            {pendingImages.length > 0 ? 'Add' : 'Drop images or click'}
          </button>
        )}
      </div>
      {error ? (
        <div className="mt-3">
          <FormErrorMessage id="product-images-error" message={error} />
        </div>
      ) : null}
    </Card>
  );
}
