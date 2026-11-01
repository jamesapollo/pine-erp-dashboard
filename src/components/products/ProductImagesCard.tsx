import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Upload } from 'lucide-react';

import { type Product, type ProductImage } from '@/types/catalogue';
import { useDeleteProductImageMutation } from '@/hooks/api/mutations/catalogue/useDeleteProductImageMutation';
import { useReorderProductImagesMutation } from '@/hooks/api/mutations/catalogue/useReorderProductImagesMutation';
import { useSetMainProductImageMutation } from '@/hooks/api/mutations/catalogue/useSetMainProductImageMutation';
import { uploadProductImage } from '@/hooks/api/mutations/catalogue/useUploadProductImageMutation';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { useToastContext } from '@/components/ui/ToastContext';
import { ImageTile } from '@/components/products/ImageTile';
import { getActionErrorMessage } from '@/utils/apiErrors';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PRODUCT_IMAGES,
  TOO_MANY_IMAGES_MESSAGE,
  validateImageFile,
} from '@/utils/imageFiles';

const addTileClasses =
  'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-control border border-dashed border-border-strong bg-transparent p-2 text-center text-[13px] font-medium leading-[1.3] text-text-secondary';

/**
 * The product's images. Every action here applies straight away; none of it goes through the
 * detail form's Save.
 */
export function ProductImagesCard({ product }: { product: Product }) {
  const { store, hasPermission } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const setMainMutation = useSetMainProductImageMutation();
  const reorderMutation = useReorderProductImagesMutation();
  const deleteMutation = useDeleteProductImageMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [imageToDelete, setImageToDelete] = useState<ProductImage>();

  const canChange = hasPermission('catalogue.manage') && product.status !== 'archived';
  const images = [...product.images].sort((first, second) => first.sort_order - second.sort_order);
  const isBusy =
    isUploading ||
    setMainMutation.isPending ||
    reorderMutation.isPending ||
    deleteMutation.isPending;
  const isFull = images.length >= MAX_PRODUCT_IMAGES;

  function onActionError(error: unknown) {
    setErrorMessage(getActionErrorMessage(error));
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || isBusy) return;
    const rejection = files.map(validateImageFile).find(Boolean);
    if (rejection) {
      setErrorMessage(rejection);
      return;
    }
    if (files.length > MAX_PRODUCT_IMAGES - images.length) {
      setErrorMessage(TOO_MANY_IMAGES_MESSAGE);
      return;
    }

    setErrorMessage(undefined);
    setIsUploading(true);
    let uploadedCount = 0;
    try {
      for (const file of files) {
        await uploadProductImage(store.id, product.id, file, product.title);
        uploadedCount += 1;
      }
    } catch (error) {
      onActionError(error);
    }
    if (uploadedCount > 0) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.product(store.id, product.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
      ]);
      showToast({
        title: 'Images uploaded',
        description: `${uploadedCount} ${uploadedCount === 1 ? 'image' : 'images'}`,
      });
    }
    setIsUploading(false);
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  function setAsCover(image: ProductImage) {
    setErrorMessage(undefined);
    setMainMutation.mutate(
      { productId: product.id, imageId: image.id },
      { onError: onActionError },
    );
  }

  function move(index: number, offset: -1 | 1) {
    const imageIds = images.map((image) => image.id);
    [imageIds[index], imageIds[index + offset]] = [imageIds[index + offset], imageIds[index]];
    setErrorMessage(undefined);
    reorderMutation.mutate({ productId: product.id, imageIds }, { onError: onActionError });
  }

  function confirmDelete() {
    if (!imageToDelete) return;
    setErrorMessage(undefined);
    deleteMutation.mutate(
      { productId: product.id, imageId: imageToDelete.id },
      {
        onSuccess: () => setImageToDelete(undefined),
        onError: (error) => {
          setImageToDelete(undefined);
          onActionError(error);
        },
      },
    );
  }

  const openPicker = () => inputRef.current?.click();

  return (
    <>
      <Card
        title="Images"
        subtitle="First image is the storefront thumbnail"
        actions={
          canChange ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={isFull || isBusy}
              isLoading={isUploading}
              onClick={openPicker}
            >
              <Icon icon={Upload} size={14} />
              Upload
            </Button>
          ) : undefined
        }
      >
        {canChange ? (
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
        ) : null}
        {errorMessage ? (
          <div className="mb-3">
            <Alert tone="danger">{errorMessage}</Alert>
          </div>
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
          {images.map((image, index) => (
            <ImageTile
              key={image.id}
              image={image}
              actions={
                canChange
                  ? {
                      isFirst: index === 0,
                      isLast: index === images.length - 1,
                      isDisabled: isBusy,
                      onSetAsCover: () => setAsCover(image),
                      onMoveLeft: () => move(index, -1),
                      onMoveRight: () => move(index, 1),
                      onDelete: () => setImageToDelete(image),
                    }
                  : undefined
              }
            />
          ))}
          {canChange && !isFull ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={openPicker}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className={`${addTileClasses} cursor-pointer focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-[0.45]`}
            >
              <Icon icon={ImagePlus} size={20} />
              {images.length > 0 ? 'Add' : 'Drop images or click'}
            </button>
          ) : null}
          {!canChange && images.length === 0 ? (
            <div className={addTileClasses}>
              <Icon icon={ImagePlus} size={20} />
              No images yet
            </div>
          ) : null}
        </div>
      </Card>
      <Dialog
        isOpen={imageToDelete !== undefined}
        title="Delete this image?"
        description="It's removed from the product straight away."
        onClose={() => setImageToDelete(undefined)}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => setImageToDelete(undefined)}
            >
              Keep
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              isLoading={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
