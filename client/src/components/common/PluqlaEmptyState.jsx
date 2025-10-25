import React from 'react';
import { motion } from 'framer-motion';
import PluqlaButton from './PluqlaButton';

/**
 * Phase 2A PluqlaEmptyState Component
 * États vides avec personnalité Pluqla
 *
 * Features:
 * - Animations engageantes (Phase 2A)
 * - Illustrations optionnelles (Phase 2A)
 * - CTA avec shimmer effect (Phase 2A)
 * - Support icônes Lucide React
 * - Message encourageant
 */

/**
 * Pluqi Mascot - Simple mascot SVG pour empty states
 */
const PluqiMascot = ({ mood = 'neutral', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  // Moods pour différents contextes
  const expressions = {
    neutral: '😊',
    encourage: '💪',
    celebrate: '🎉',
    thinking: '🤔',
    search: '🔍',
    empty: '📭',
    rocket: '🚀',
    piggy: '🐷'
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        rounded-full
        pluqla-gradient-primary
        flex items-center justify-center
        text-4xl
        shadow-lg
      `}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
    >
      <motion.span
        animate={{
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {expressions[mood] || expressions.neutral}
      </motion.span>
    </motion.div>
  );
};

/**
 * Main PluqlaEmptyState Component
 */
const PluqlaEmptyState = ({
  icon: Icon,
  illustration = 'pluqi', // pluqi | piggy | rocket | search | empty | custom
  mood = 'neutral',
  title,
  description,
  action,           // { text: string, onClick: function, variant?: string }
  secondaryAction,  // { text: string, onClick: function }
  children,         // Custom content
  className = ''
}) => {
  // Render illustration basée sur le type
  const renderIllustration = () => {
    // Custom icon (Lucide React)
    if (Icon) {
      return (
        <motion.div
          className="w-24 h-24 rounded-full bg-pluqla-red-soft dark:bg-pluqla-red/20 flex items-center justify-center mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
        >
          <Icon className="w-12 h-12 text-pluqla-red" strokeWidth={1.5} />
        </motion.div>
      );
    }

    // Pluqi mascot
    if (illustration === 'pluqi') {
      return <PluqiMascot mood={mood} size="lg" />;
    }

    // Emoji-based illustrations
    const emojiIllustrations = {
      piggy: '🐷',
      rocket: '🚀',
      search: '🔍',
      empty: '📭',
      celebrate: '🎉',
      thinking: '🤔'
    };

    if (emojiIllustrations[illustration]) {
      return (
        <motion.div
          className="text-7xl mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
        >
          <motion.span
            animate={{
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {emojiIllustrations[illustration]}
          </motion.span>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <motion.div
      className={`
        flex flex-col items-center justify-center
        text-center
        py-12 px-6
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Illustration */}
      {renderIllustration()}

      {/* Title */}
      {title && (
        <motion.h3
          className="text-2xl font-bold text-gray-900 dark:text-white mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {title}
        </motion.h3>
      )}

      {/* Description */}
      {description && (
        <motion.p
          className="text-gray-600 dark:text-gray-400 mb-6 max-w-md leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {description}
        </motion.p>
      )}

      {/* Custom children content */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3 mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {/* Primary action */}
          {action && (
            <PluqlaButton
              variant={action.variant || 'primary'}
              shimmer={true}
              glow={true}
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.text}
            </PluqlaButton>
          )}

          {/* Secondary action */}
          {secondaryAction && (
            <PluqlaButton
              variant="ghost"
              onClick={secondaryAction.onClick}
              icon={secondaryAction.icon}
            >
              {secondaryAction.text}
            </PluqlaButton>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * Pre-configured Empty State Variants
 */

// No Transactions
export const NoTransactionsEmptyState = ({ onAddTransaction }) => (
  <PluqlaEmptyState
    illustration="piggy"
    title="Aucune transaction"
    description="Commencez à suivre vos dépenses et économies dès aujourd'hui pour atteindre vos objectifs financiers."
    action={{
      text: 'Ajouter une transaction',
      onClick: onAddTransaction
    }}
  />
);

// No Recipes
export const NoRecipesEmptyState = ({ onExplore }) => (
  <PluqlaEmptyState
    illustration="search"
    title="Aucune recette trouvée"
    description="Explorez notre collection de recettes économiques et délicieuses pour économiser tout en mangeant bien."
    action={{
      text: 'Explorer les recettes',
      onClick: onExplore
    }}
  />
);

// No Goals
export const NoGoalsEmptyState = ({ onCreateGoal }) => (
  <PluqlaEmptyState
    illustration="rocket"
    mood="encourage"
    title="Aucun objectif défini"
    description="Créez votre premier objectif d'économie et laissez Pluqla vous aider à l'atteindre."
    action={{
      text: 'Créer un objectif',
      onClick: onCreateGoal
    }}
  />
);

// Search No Results
export const SearchEmptyState = ({ query, onReset }) => (
  <PluqlaEmptyState
    illustration="search"
    title="Aucun résultat"
    description={`Aucun résultat trouvé pour "${query}". Essayez avec d'autres mots-clés ou réinitialisez votre recherche.`}
    action={{
      text: 'Réinitialiser',
      onClick: onReset,
      variant: 'secondary'
    }}
  />
);

// Generic Empty State
export const GenericEmptyState = ({ title, description, onAction }) => (
  <PluqlaEmptyState
    illustration="pluqi"
    mood="encourage"
    title={title}
    description={description}
    action={onAction ? {
      text: onAction.text,
      onClick: onAction.onClick
    } : undefined}
  />
);

// Success/Completion State
export const SuccessEmptyState = ({ title, description, onNext }) => (
  <PluqlaEmptyState
    illustration="celebrate"
    title={title}
    description={description}
    action={onNext ? {
      text: onNext.text,
      onClick: onNext.onClick
    } : undefined}
  />
);

export default PluqlaEmptyState;
export { PluqiMascot };
