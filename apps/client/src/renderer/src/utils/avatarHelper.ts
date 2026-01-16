// Helper to construct full avatar URL from relative path
// Avatar paths are stored as: /avatars/userId/filename.ext

// MinIO storage endpoint
const MINIO_BASE_URL = 'http://163.192.96.105:9000';

/**
 * Get full avatar URL from a relative or absolute path
 * @param avatarUrl - Can be relative (/avatars/...) or absolute (http://...)
 * @returns Full URL to the avatar image
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl) return null;

    // If it's already a full URL (legacy), return as-is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        return avatarUrl;
    }

    // It's a relative path, construct full URL
    return `${MINIO_BASE_URL}${avatarUrl}`;
}

/**
 * Check if an avatar URL exists
 */
export function hasAvatar(avatarUrl: string | null | undefined): boolean {
    return !!avatarUrl && avatarUrl.length > 0;
}
