import React, { useState, memo } from 'react';
import { getAvatarUrl } from '../utils/getAvatarUrl';

 

/**
 * Production-ready Avatar component with Cloudinary optimizations
 * 
 * Features:
 * - Lazy loading for performance
 * - Fixed dimensions to prevent layout shift
 * - onError fallback to UI Avatars
 * - Optional Cloudinary transformations
 * - Initials fallback when no avatar
 */

const Avatar = memo(({
    src,
    name = '',
    size = 'md',
    className = '',
    alt,
    cloudinaryTransform = true,
}) => {
    const [imgError, setImgError] = useState(false);

    // Size presets with fixed dimensions
    const sizeConfig = {
        xs: { className: 'w-6 h-6', text: 'text-xs', dimension: 24 },
        sm: { className: 'w-8 h-8', text: 'text-xs', dimension: 32 },
        md: { className: 'w-10 h-10', text: 'text-sm', dimension: 40 },
        lg: { className: 'w-12 h-12', text: 'text-base', dimension: 48 },
        xl: { className: 'w-16 h-16', text: 'text-xl', dimension: 64 },
        '2xl': { className: 'w-20 h-20', text: 'text-2xl', dimension: 80 },
    };

    const config = sizeConfig[size] || sizeConfig.md;

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    };

    // Apply Cloudinary transformations if applicable
    const getOptimizedUrl = (url) => {
        if (!url || !cloudinaryTransform) return url;

        // Check if this is a Cloudinary URL
        if (url.includes('cloudinary.com') || url.includes('res.cloudinary')) {
            // Check if transformations already exist
            if (url.includes('/upload/') && !url.includes('/upload/f_auto')) {
                // Insert auto format and quality transformations
                return url.replace(
                    '/upload/',
                    `/upload/f_auto,q_auto,w_${config.dimension * 2},h_${config.dimension * 2},c_fill,g_face/`
                );
            }
        }
        return url;
    };

    // Get the avatar URL using shared utility
    const avatarUrl = getAvatarUrl(src, name);
    const optimizedUrl = getOptimizedUrl(avatarUrl);

    // Fallback URL (UI Avatars)
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&size=${config.dimension * 2}`;

    // Handle image error
    const handleError = (e) => {
        e.target.onerror = null;
        setImgError(true);
    };

    // Render initials fallback
    if (!src || imgError) {
        // If there's an avatar URL from getAvatarUrl (placeholder), use it
        if (!src) {
            return (
                <img
                    src={fallbackUrl}
                    alt={alt || name || 'Avatar'}
                    className={`rounded-full object-cover ${config.className} ${className}`}
                    width={config.dimension}
                    height={config.dimension}
                    loading="lazy"
                />
            );
        }
        // Error state - show initials
        return (
            <div
                className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-semibold ${config.className} ${config.text} ${className}`}
                style={{ width: config.dimension, height: config.dimension }}
            >
                {getInitials(name)}
            </div>
        );
    }

    return (
        <img
            src={optimizedUrl}
            alt={alt || name || 'Avatar'}
            className={`rounded-full object-cover ${config.className} ${className}`}
            width={config.dimension}
            height={config.dimension}
            loading="lazy"
            onError={handleError}
        />
    );
});

Avatar.displayName = 'Avatar';

export default Avatar;
