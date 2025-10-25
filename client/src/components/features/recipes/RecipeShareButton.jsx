/**
 * RecipeShareButton Component
 *
 * Social sharing button for recipes using Web Share API
 * Includes UTM tracking and fallback for non-supporting browsers
 *
 * Features:
 * - Native Web Share API (mobile-first)
 * - Copy to clipboard fallback
 * - UTM tracking parameters
 * - Share analytics
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';

/**
 * Generate share URL with UTM parameters
 */
const generateShareUrl = (recipeId, provider, source = 'web_share') => {
  const baseUrl = window.location.origin;
  const url = new URL(`${baseUrl}/recipes/${provider}/${recipeId}`);

  // UTM parameters for tracking
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', 'recipe_share');
  url.searchParams.set('utm_content', `${provider}_${recipeId}`);

  return url.toString();
};

/**
 * RecipeShareButton Component
 */
const RecipeShareButton = ({
  recipe,
  variant = 'icon', // 'icon' | 'button' | 'menu'
  showLabel = false,
  onShareSuccess,
  onShareError,
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Check if Web Share API is supported
  const isWebShareSupported = typeof navigator !== 'undefined' && navigator.share;

  /**
   * Track share event (analytics)
   */
  const trackShare = (method, success = true) => {
    // Send to analytics (Google Analytics, Mixpanel, etc.)
    if (window.gtag) {
      window.gtag('event', 'share', {
        method,
        content_type: 'recipe',
        content_id: `${recipe.provider}_${recipe.id}`,
        success,
      });
    }

    // Custom event for internal tracking
    window.dispatchEvent(new CustomEvent('recipe:shared', {
      detail: { recipe, method, success },
    }));
  };

  /**
   * Handle native Web Share API
   */
  const handleNativeShare = async () => {
    if (!isWebShareSupported) return;

    setIsSharing(true);

    try {
      const shareData = {
        title: `${recipe.title} - Pluqla`,
        text: `Découvre cette délicieuse recette : ${recipe.title}`,
        url: generateShareUrl(recipe.id, recipe.provider, 'native_share'),
      };

      await navigator.share(shareData);

      trackShare('native_share', true);
      onShareSuccess?.('native_share');

    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        trackShare('native_share', false);
        onShareError?.(error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = async () => {
    const url = generateShareUrl(recipe.id, recipe.provider, 'copy_link');

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackShare('copy_link', true);
      onShareSuccess?.('copy_link');

      // Reset copied state after 2s
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      trackShare('copy_link', false);
      onShareError?.(error);
    }
  };

  /**
   * Share on Facebook
   */
  const handleShareFacebook = () => {
    const url = generateShareUrl(recipe.id, recipe.provider, 'facebook');
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    window.open(facebookUrl, '_blank', 'width=600,height=400');
    trackShare('facebook', true);
    onShareSuccess?.('facebook');
    setShowMenu(false);
  };

  /**
   * Share on Twitter
   */
  const handleShareTwitter = () => {
    const url = generateShareUrl(recipe.id, recipe.provider, 'twitter');
    const text = `Découvre cette recette : ${recipe.title}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

    window.open(twitterUrl, '_blank', 'width=600,height=400');
    trackShare('twitter', true);
    onShareSuccess?.('twitter');
    setShowMenu(false);
  };

  /**
   * Render icon button variant
   */
  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isWebShareSupported ? handleNativeShare : () => setShowMenu(!showMenu)}
          disabled={isSharing}
          className="
            p-2.5
            rounded-full
            bg-white/90
            backdrop-blur-sm
            border border-gray-200
            text-gray-700
            hover:bg-[#E63946]
            hover:text-white
            hover:border-[#E63946]
            transition-all duration-200
            shadow-md
            hover:shadow-lg
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          aria-label="Partager la recette"
          title="Partager"
        >
          <Share2 size={20} className={isSharing ? 'animate-pulse' : ''} />
        </motion.button>

        {/* Share Menu (fallback for non-supporting browsers) */}
        <AnimatePresence>
          {showMenu && !isWebShareSupported && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="
                  absolute top-full right-0 mt-2
                  bg-white
                  rounded-xl
                  shadow-2xl
                  border border-gray-200
                  p-2
                  min-w-[200px]
                  z-50
                "
              >
                <button
                  onClick={handleCopyLink}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5
                    rounded-lg
                    hover:bg-gray-50
                    transition-colors
                    text-left
                  "
                >
                  {copied ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <Copy size={18} className="text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {copied ? 'Copié !' : 'Copier le lien'}
                  </span>
                </button>

                <button
                  onClick={handleShareFacebook}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5
                    rounded-lg
                    hover:bg-blue-50
                    transition-colors
                    text-left
                  "
                >
                  <Facebook size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Facebook
                  </span>
                </button>

                <button
                  onClick={handleShareTwitter}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5
                    rounded-lg
                    hover:bg-blue-50
                    transition-colors
                    text-left
                  "
                >
                  <Twitter size={18} className="text-blue-400" />
                  <span className="text-sm font-medium text-gray-700">
                    Twitter
                  </span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /**
   * Render full button variant
   */
  if (variant === 'button') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={isWebShareSupported ? handleNativeShare : () => setShowMenu(!showMenu)}
        disabled={isSharing}
        className={`
          flex items-center justify-center gap-2
          px-5 py-3
          rounded-xl
          bg-white/80
          backdrop-blur-md
          border border-gray-200
          text-gray-700
          font-medium
          hover:bg-[#E63946]
          hover:text-white
          hover:border-[#E63946]
          transition-all duration-200
          shadow-md
          hover:shadow-lg
          disabled:opacity-50
          disabled:cursor-not-allowed
          ${className}
        `}
      >
        <Share2 size={20} className={isSharing ? 'animate-pulse' : ''} />
        {showLabel && <span>Partager</span>}
      </motion.button>
    );
  }

  return null;
};

RecipeShareButton.propTypes = {
  /** Recipe object to share */
  recipe: PropTypes.shape({
    id: PropTypes.string.isRequired,
    provider: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    image: PropTypes.string,
  }).isRequired,
  /** Button variant */
  variant: PropTypes.oneOf(['icon', 'button', 'menu']),
  /** Show label text */
  showLabel: PropTypes.bool,
  /** Callback when share succeeds */
  onShareSuccess: PropTypes.func,
  /** Callback when share fails */
  onShareError: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default RecipeShareButton;

/**
 * Hook for share analytics
 */
export const useShareAnalytics = () => {
  React.useEffect(() => {
    const handleShareEvent = (event) => {
      const { recipe, method, success } = event.detail;

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Recipe shared:', { recipe: recipe.title, method, success });
      }
    };

    window.addEventListener('recipe:shared', handleShareEvent);
    return () => window.removeEventListener('recipe:shared', handleShareEvent);
  }, []);
};
