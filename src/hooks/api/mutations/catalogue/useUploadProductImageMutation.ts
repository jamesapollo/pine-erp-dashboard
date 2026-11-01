import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ProductImage } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function uploadProductImage(
  storeId: number,
  productId: number,
  file: File,
  altText: string,
): Promise<ProductImage> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('alt_text', altText);
  const { data } = await axiosInstance.post<{ data: ProductImage }>(
    storePath(storeId, `/products/${productId}/images`),
    formData,
  );
  return data.data;
}

export type UploadProductImageMutationParams = { productId: number; file: File; altText: string };

export function useUploadProductImageMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ productId, file, altText }: UploadProductImageMutationParams) =>
      uploadProductImage(store.id, productId, file, altText),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
