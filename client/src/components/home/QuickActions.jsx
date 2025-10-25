import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { Plus, Sparkles, Target, Zap } from 'lucide-react';

/**
 * Phase 2B Enhanced QuickActions
 * Glassmorphism + Staggered animations + Lucide icons
 */

const QuickActions = ({ darkMode }) => {
  const { setCurrentScreen } = useNavigation();

  const actions = [
    {
      id: 'add-transaction',
      icon: Plus,
      label: 'Ajouter',
      sublabel: 'Transaction',
      action: () => setCurrentScreen('finance'),
      color: 'red'
    },
    {
      id: 'ai-advice',
      icon: Sparkles,
      label: 'Conseil',
      sublabel: 'IA',
      action: () => setCurrentScreen('finance'),
      color: 'purple'
    },
    {
      id: 'challenge',
      icon: Target,
      label: 'Objectif',
      sublabel: 'du mois',
      action: () => setCurrentScreen('finance'),
      color: 'blue'
    },
    {
      id: 'boost',
      icon: Zap,
      label: 'Boost',
      sublabel: 'épargne',
      action: () => setCurrentScreen('finance'),
      color: 'orange'
    }
  ];

  // Color gradients
  const colorGradients = {
    red: 'pluqla-gradient-primary',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-600',
    blue: 'pluqla-gradient-info',
    orange: 'pluqla-gradient-warning'
  };

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  // Item animation
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.div
        className="grid grid-cols-4 gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {actions.map((action) => {
          const IconComponent = action.icon;

          return (
            <motion.button
              key={action.id}
              onClick={action.action}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative p-3 rounded-xl overflow-hidden group
                pluqla-card pluqla-card-glass
                hover:pluqla-shadow-premium
                transition-shadow duration-300
              `}
            >
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center space-y-2">
                {/* Icon avec gradient background */}
                <div className={`
                  w-10 h-10 rounded-xl
                  ${colorGradients[action.color]}
                  flex items-center justify-center
                  shadow-md
                  transition-transform duration-300
                  group-hover:scale-110
                `}>
                  <IconComponent className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>

                {/* Labels */}
                <div className="text-center">
                  <div className={`text-xs font-bold leading-tight ${
                    darkMode ? 'text-white' : 'text-[#121212]'
                  }`}>
                    {action.label}
                  </div>
                  <div className={`text-[10px] ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {action.sublabel}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default QuickActions;
