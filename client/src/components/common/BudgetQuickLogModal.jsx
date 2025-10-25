/**
 * Budget Quick-Log Modal
 *
 * Permet d'ajouter rapidement une recette au budget alimentaire
 * Conversion Recipe → Budget en 2 clics au lieu de 5
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - recipe: { id, provider, name/title, price, servings, ... }
 *
 * Flow:
 * 1. User clique "💰 Ajouter au budget" sur RecipeCard
 * 2. Modal s'ouvre avec données pré-remplies
 * 3. User ajuste nb portions (optionnel)
 * 4. User clique "Confirmer"
 * 5. POST /api/food-spending
 * 6. Toast confirmation + fermeture
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from '../../utils/lazyFramerMotion';
import { X, DollarSign, Users, Calendar, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useLogFoodSpending, useCheckDuplicate } from '../../hooks/useRecipesQuery';

const BudgetQuickLogModal = ({ isOpen, onClose, recipe }) => {
  const [servings, setServings] = useState(recipe?.servings || 1);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [ignoreWarning, setIgnoreWarning] = useState(false);

  const { mutate: logSpending, isPending } = useLogFoodSpending();
  const { mutate: checkDuplicate, isPending: isCheckingDuplicate } = useCheckDuplicate();

  // Reset servings when recipe changes
  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings || 1);
    }
  }, [recipe]);

  // Check for duplicates when modal opens
  useEffect(() => {
    if (isOpen && recipe) {
      const pricePerServing = recipe.price / (recipe.servings || 1);
      const totalCost = pricePerServing * servings;

      checkDuplicate(
        {
          amount: totalCost,
          date: new Date().toISOString(),
        },
        {
          onSuccess: (data) => {
            if (data && data.hasDuplicates) {
              setDuplicateInfo(data);
            } else {
              setDuplicateInfo(null);
            }
          },
          onError: () => {
            // Silently fail - don't block user if check fails
            setDuplicateInfo(null);
          },
        }
      );
    }
  }, [isOpen, recipe, servings, checkDuplicate]);

  if (!recipe) return null;

  const pricePerServing = recipe.price / (recipe.servings || 1);
  const totalCost = pricePerServing * servings;

  const handleConfirm = () => {
    // Don't submit if duplicate warning is shown and user hasn't ignored it
    if (duplicateInfo && duplicateInfo.hasDuplicates && !ignoreWarning) {
      return;
    }

    const spendingData = {
      externalId: recipe.id,
      provider: recipe.provider,
      recipeName: recipe.name || recipe.title,
      costEur: totalCost,
      servings: servings,
      metadata: {
        category: recipe.category || 'food',
        originalServings: recipe.servings,
        dateLogged: new Date().toISOString(),
      },
    };

    logSpending(spendingData, {
      onSuccess: () => {
        onClose();
        // Reset states
        setDuplicateInfo(null);
        setIgnoreWarning(false);
      },
    });
  };

  const handleUseExisting = () => {
    // Close modal without adding - user will use existing transaction
    onClose();
    setDuplicateInfo(null);
    setIgnoreWarning(false);
  };

  const handleIgnoreWarning = () => {
    setIgnoreWarning(true);
  };

  const handleIncrement = () => setServings((prev) => Math.min(prev + 1, 20));
  const handleDecrement = () => setServings((prev) => Math.max(prev - 1, 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-log-title"
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#F14545] to-[#E63946] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <h2 id="quick-log-title" className="text-lg font-semibold">
                        Ajouter au budget
                      </h2>
                    </div>
                    <p className="text-white/90 text-sm">
                      Enregistrer cette recette comme dépense prévue
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    aria-label="Fermer"
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Recipe Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recette
                  </label>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="font-semibold text-gray-900">
                      {recipe.name || recipe.title}
                    </p>
                    {recipe.category && (
                      <p className="text-sm text-gray-600 mt-1">{recipe.category}</p>
                    )}
                  </div>
                </div>

                {/* Servings Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Nombre de personnes
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleDecrement}
                      disabled={servings <= 1}
                      className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xl transition-colors"
                      aria-label="Diminuer le nombre de portions"
                    >
                      −
                    </button>

                    <div className="flex-1 text-center">
                      <span className="text-3xl font-bold text-gray-900">{servings}</span>
                      <span className="text-sm text-gray-600 block">
                        personne{servings > 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      onClick={handleIncrement}
                      disabled={servings >= 20}
                      className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xl transition-colors"
                      aria-label="Augmenter le nombre de portions"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">Prix par personne</span>
                    <span className="font-medium text-gray-900">
                      {pricePerServing.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <span className="font-semibold text-gray-900">Coût total</span>
                    <span className="text-2xl font-bold text-[#F14545]">
                      {totalCost.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Date Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Enregistré le {new Date().toLocaleDateString('fr-FR')}</span>
                </div>

                {/* Duplicate Warning */}
                {duplicateInfo && duplicateInfo.hasDuplicates && !ignoreWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-900 mb-1">
                          Doublon potentiel détecté
                        </h4>
                        <p className="text-sm text-orange-800 leading-relaxed">
                          {duplicateInfo.message ||
                            `Une transaction similaire existe déjà (${duplicateInfo.potentialDuplicates?.length || 0} trouvée${duplicateInfo.potentialDuplicates?.length > 1 ? 's' : ''}). Cela pourrait créer un doublon dans votre budget.`}
                        </p>
                        {duplicateInfo.potentialDuplicates && duplicateInfo.potentialDuplicates.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {duplicateInfo.potentialDuplicates.slice(0, 2).map((dup, index) => (
                              <div key={index} className="text-xs text-orange-700 bg-orange-100 rounded px-2 py-1">
                                {dup.description || 'Transaction'} - {dup.amount?.toFixed(2)} € le{' '}
                                {new Date(dup.date).toLocaleDateString('fr-FR')}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUseExisting}
                        className="flex-1 px-3 py-2 text-sm font-medium text-orange-700 bg-white border-2 border-orange-300 rounded-lg hover:bg-orange-50 transition-all"
                      >
                        Utiliser l'existant
                      </button>
                      <button
                        onClick={handleIgnoreWarning}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-all"
                      >
                        Ajouter quand même
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Loading Duplicate Check */}
                {isCheckingDuplicate && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Vérification des doublons...</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all"
                >
                  Annuler
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isPending || (duplicateInfo && duplicateInfo.hasDuplicates && !ignoreWarning)}
                  className={`
                    flex-1 px-4 py-3 rounded-xl font-medium text-white
                    ${duplicateInfo && duplicateInfo.hasDuplicates && !ignoreWarning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#F14545] hover:bg-[#E63946] shadow-lg hover:shadow-xl'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all
                    flex items-center justify-center gap-2
                  `}
                  title={duplicateInfo && duplicateInfo.hasDuplicates && !ignoreWarning
                    ? 'Veuillez choisir une option ci-dessus'
                    : ''
                  }
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>{ignoreWarning ? 'Confirmer quand même' : 'Confirmer'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

BudgetQuickLogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  recipe: PropTypes.shape({
    id: PropTypes.string.isRequired,
    provider: PropTypes.string.isRequired,
    name: PropTypes.string,
    title: PropTypes.string,
    price: PropTypes.number.isRequired,
    servings: PropTypes.number,
    category: PropTypes.string,
  }),
};

export default BudgetQuickLogModal;
