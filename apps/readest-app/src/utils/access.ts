/**
 * Transitional compatibility for legacy hosted-storage helpers.
 * The local-only application has no Readest account or access token.
 */
export const getAccessToken = async (): Promise<string | null> => null;

export const getUserID = async (): Promise<string | null> => null;
