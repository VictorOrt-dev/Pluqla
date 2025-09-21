import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAnalytics } from '../../../services/analyticsService';
import LazyImage from '../../common/LazyImage';

const PinterestFeed = ({ aiSuggestions = [], isLoading, darkMode, onMoveToAnalyze, onLike }) => {
  const { trackUserAction } = useAnalytics();
  const [likedItems, setLikedItems] = useState(new Set());
  const [hoveredItem, setHoveredItem] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Détecter la préférence utilisateur pour les animations réduites
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Mock suggestions si pas de données IA
  const mockSuggestions = [
    {
      id: 'trend1',
      title: 'Style Minimaliste Scandinave',
      description: 'Tenues épurées aux couleurs neutres',
      imageUrl: 'https://via.placeholder.com/300x400/F5F5F5/666?text=Style+Minimaliste',
      category: 'minimaliste',
      price: '45-120€',
      tags: ['basique', 'neutre', 'élégant'],
      popularity: 89
    },
    {
      id: 'trend2',
      title: 'Vintage 90s Revival',
      description: 'Le retour des années 90 avec une touche moderne',
      imageUrl: 'https://via.placeholder.com/300x350/E8D5C4/444?text=Vintage+90s',
      category: 'vintage',
      price: '35-85€',
      tags: ['rétro', 'tendance', 'décontracté'],
      popularity: 76
    },
    {
      id: 'trend3',
      title: 'Cottagecore Aesthetic',
      description: 'Romantique et champêtre, parfait pour l\'automne',
      imageUrl: 'https://via.placeholder.com/300x450/D4A574/FFF?text=Cottagecore',
      category: 'romantique',
      price: '55-140€',
      tags: ['romantique', 'naturel', 'doux'],
      popularity: 92
    },
    {
      id: 'trend4',
      title: 'Streetwear Urbain',
      description: 'Mode urbaine avec sneakers et oversized',
      imageUrl: 'https://via.placeholder.com/300x320/2C3E50/FFF?text=Streetwear',
      category: 'streetwear',
      price: '60-200€',
      tags: ['urbain', 'jeune', 'sport'],
      popularity: 84
    },
    {
      id: 'trend5',
      title: 'Business Casual Moderne',
      description: 'Élégance professionnelle réinventée',
      imageUrl: 'https://via.placeholder.com/300x380/34495E/FFF?text=Business+Casual',
      category: 'professionnel',
      price: '80-250€',
      tags: ['professionnel', 'chic', 'moderne'],
      popularity: 71
    },
    {
      id: 'trend6',
      title: 'Boho Chic Moderne',
      description: 'Esprit bohème avec une touche contemporaine',
      imageUrl: 'https://via.placeholder.com/300x420/8B4513/FFF?text=Boho+Chic',
      category: 'bohème',
      price: '40-110€',
      tags: ['bohème', 'libre', 'artistique'],
      popularity: 88
    }
  ];

  // Utiliser les suggestions IA ou les mock data (memoized pour éviter re-renders)
  const suggestions = useMemo(() => {
    return aiSuggestions.length > 0 ? aiSuggestions : mockSuggestions;
  }, [aiSuggestions]);

  const handleLike = useCallback((itemId) => {
    const newLikedItems = new Set(likedItems);
    const isLiked = likedItems.has(itemId);

    if (isLiked) {
      newLikedItems.delete(itemId);
    } else {
      newLikedItems.add(itemId);
    }

    setLikedItems(newLikedItems);

    // Analytics
    trackUserAction(isLiked ? 'unlike_trend' : 'like_trend', itemId);

    // Callback parent
    if (onLike) {
      onLike(itemId, !isLiked);
    }
  }, [likedItems, onLike, trackUserAction]);

  const handleMoveToAnalyze = useCallback((item) => {
    trackUserAction('move_to_analyze', item.id);
    if (onMoveToAnalyze) {
      onMoveToAnalyze(item);
    }
  }, [onMoveToAnalyze, trackUserAction]);

  // Skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className={`text-center p-8 rounded-2xl ${
          darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'
        }`}>
          <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            L'IA analyse vos goûts pour des suggestions personnalisées...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`glass-effect p-6 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ✨ Tendances Pour Vous
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Basé sur vos goûts et les dernières tendances
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            darkMode
              ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50'
              : 'bg-purple-100/80 text-purple-700 border border-purple-200/60'
          }`}>
            {suggestions.length} suggestions
          </div>
        </div>

        {/* Statistiques des likes */}
        {likedItems.size > 0 && (
          <div className={`p-3 rounded-xl mb-4 ${
            darkMode ? 'bg-purple-900/20' : 'bg-purple-50'
          }`}>
            <p className={`text-sm ${
              darkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>
              💜 {likedItems.size} style{likedItems.size > 1 ? 's' : ''} ajouté{likedItems.size > 1 ? 's' : ''} à vos préférences
            </p>
          </div>
        )}
      </div>

      {/* Pinterest-style Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {suggestions.map((item, index) => {
          const isLiked = likedItems.has(item.id);
          const isHovered = hoveredItem === item.id;

          return (
            <div
              key={item.id}
              className={`break-inside-avoid mb-4 group cursor-pointer transform transition-all ${
                prefersReducedMotion ? 'duration-200 hover:scale-[1.01]' : 'duration-300 hover:scale-[1.02]'
              } ${
                isHovered ? 'z-10' : ''
              }`}
              onMouseEnter={() => !prefersReducedMotion && setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                animationDelay: prefersReducedMotion ? '0ms' : `${index * 50}ms` // Réduction délais animation
              }}
            >
              <div className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 ${
                darkMode
                  ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700/50'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/50'
              }`}>

                {/* Image avec Lazy Loading Optimisé */}
                <div className="relative overflow-hidden">
                  <LazyImage
                    src={item.imageUrl || item.image}
                    alt={item.title}
                    className={`w-full object-cover transition-transform ${
                      prefersReducedMotion ? 'duration-200' : 'duration-700'
                    } ${
                      prefersReducedMotion ? 'group-hover:scale-105' : 'group-hover:scale-110'
                    }`}
                    style={{
                      height: `${200 + (index % 3) * 60}px`,
                      minHeight: '200px'
                    }}
                    placeholder={
                      <div
                        className="w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center animate-pulse"
                        style={{
                          height: `${200 + (index % 3) * 60}px`,
                          minHeight: '200px'
                        }}
                      >
                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    }
                  />

                  {/* Overlay au hover */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${
                    prefersReducedMotion ? 'duration-150' : 'duration-300'
                  }`}>
                    <div className="absolute top-3 right-3 flex space-x-2">
                      {/* Bouton Like */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(item.id);
                        }}
                        className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                          prefersReducedMotion ? 'duration-150' : 'duration-300'
                        } transform ${
                          prefersReducedMotion ? 'hover:scale-105' : 'hover:scale-110'
                        } ${
                          isLiked
                            ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/25'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>

                      {/* Bouton Analyser */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToAnalyze(item);
                        }}
                        className={`p-2 rounded-full bg-purple-500/90 text-white backdrop-blur-sm transition-all ${
                          prefersReducedMotion ? 'duration-150' : 'duration-300'
                        } transform ${
                          prefersReducedMotion ? 'hover:scale-105' : 'hover:scale-110'
                        } hover:bg-purple-600/90 shadow-lg shadow-purple-500/25`}
                        title="Analyser où acheter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Badge popularité */}
                  {item.popularity && (
                    <div className="absolute top-3 left-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                        item.popularity > 85
                          ? 'bg-green-500/90 text-white'
                          : item.popularity > 70
                          ? 'bg-yellow-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                      }`}>
                        🔥 {item.popularity}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="p-4">
                  <h4 className={`font-semibold mb-2 line-clamp-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.title}
                  </h4>

                  <p className={`text-sm mb-3 line-clamp-2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {item.description}
                  </p>

                  {/* Prix */}
                  {item.price && (
                    <div className={`text-sm font-semibold mb-3 ${
                      darkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      💰 {item.price}
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className={`px-2 py-1 text-xs rounded-full ${
                            darkMode
                              ? 'bg-gray-700/50 text-gray-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleLike(item.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        prefersReducedMotion ? 'duration-150' : 'duration-300'
                      } ${
                        isLiked
                          ? darkMode
                            ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                            : 'bg-red-50 text-red-600 border border-red-200'
                          : darkMode
                            ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      {isLiked ? '💜 Aimé' : '🤍 J\'aime'}
                    </button>

                    <button
                      onClick={() => handleMoveToAnalyze(item)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        prefersReducedMotion ? 'duration-150' : 'duration-300'
                      } ${
                        darkMode
                          ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-600/30'
                          : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      🔍 Analyser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si aucune suggestion */}
      {suggestions.length === 0 && !isLoading && (
        <div className={`text-center p-12 rounded-2xl ${
          darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'
        }`}>
          <div className="text-4xl mb-4">🎨</div>
          <h3 className={`text-lg font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Aucune tendance pour le moment
          </h3>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            L'IA apprend vos goûts pour vous proposer des styles personnalisés
          </p>
        </div>
      )}
    </div>
  );
};

export default PinterestFeed;