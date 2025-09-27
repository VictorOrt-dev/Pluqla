import React, { useState, useRef, useEffect } from 'react';

const LazyImage = ({
  src,
  alt,
  className = '',
  style = {},
  placeholder = null,
  onLoad = null,
  onError = null
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef();

  // Intersection Observer pour détecter quand l'image entre dans le viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Charger les images 50px avant qu'elles soient visibles
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  // Placeholder par défaut
  const defaultPlaceholder = (
    <div
      className={`bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className}`}
      style={style}
    >
      <svg className="w-8 h-8 text-gray-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    </div>
  );

  // Placeholder d'erreur
  const errorPlaceholder = (
    <div
      className={`bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center ${className}`}
      style={style}
    >
      <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </div>
  );

  return (
    <div ref={imgRef} className="relative overflow-hidden">
      {/* Placeholder pendant le chargement */}
      {!isLoaded && !hasError && (placeholder || defaultPlaceholder)}

      {/* Placeholder en cas d'erreur */}
      {hasError && errorPlaceholder}

      {/* Image réelle */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          } ${className}`}
          style={style}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LazyImage;