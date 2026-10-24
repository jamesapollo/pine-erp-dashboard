export type ValidationErrorBody = {
  message: string;
  errors: Record<string, string[]>;
};
