/**
 * Shared utility for constructing avatar URLs across all modules.
 * Handles:
 * - Default placeholder avatar (UI Avatars)
 * - Absolute URLs (http/https) 
 * - Relative paths (/uploads/...) with backend base URL
 *
 * @param {string|null} avatar - Avatar path or URL from database
 * @param {string|null} name - User name for placeholder generation
 * @returns {string} Full avatar URL or placeholder URL
 */
export const getAvatarUrl = (avatar, name = '') => {
    // Return placeholder if no avatar
    if (!avatar) {
        return name
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            : `https://ui-avatars.com/api/?name=User&background=random`;
    }

    // Return absolute URLs as-is (external URLs or blob URLs for previews)
    if (avatar.startsWith('http') || avatar.startsWith('blob:') || avatar.startsWith('data:')) {
        return avatar;
    }

    // Prepend backend URL for relative paths
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
};

export default getAvatarUrl;
