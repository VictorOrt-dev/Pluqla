import React, { useState } from 'react';
import { apiAdapter } from '../../services/api/apiAdapter';
import secureLogger from '../../utils/secureLogger';

/**
 * ✨ Phase 1C - GDPR Settings Component
 *
 * Provides user interface for GDPR compliance (Phase 1B integration):
 * - Export user data (Article 15 - Right of access)
 * - Delete account (Article 17 - Right to erasure)
 * - View audit trail
 * - Request data correction (Article 16)
 */
const GDPRSettings = ({ darkMode, showNotification }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // ============================================================================
  // EXPORT USER DATA (Article 15)
  // ============================================================================

  const handleExportData = async () => {
    setIsExporting(true);

    try {
      const response = await apiAdapter.get('/gdpr/export');

      if (response.data) {
        // Convert to JSON and download
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pluqla-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showNotification?.('✅ Vos données ont été exportées avec succès!', 'success');

        secureLogger.info('GDPR data export successful', {
          size: dataStr.length
        });
      }
    } catch (error) {
      secureLogger.error('GDPR export failed', {
        error: error.message
      });

      if (error.response?.status === 429) {
        showNotification?.('⏳ Limite d\'export atteinte. Réessayez dans 24h.', 'error');
      } else {
        showNotification?.('❌ Erreur lors de l\'export des données', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================================
  // DELETE ACCOUNT (Article 17)
  // ============================================================================

  const handleDeleteAccount = async () => {
    if (!deletePassword || deleteConfirmation !== 'DELETE MY ACCOUNT') {
      showNotification?.('❌ Veuillez remplir tous les champs correctement', 'error');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await apiAdapter.delete('/gdpr/delete-account', {
        data: {
          password: deletePassword,
          confirmation: deleteConfirmation
        }
      });

      if (response.data?.success) {
        showNotification?.('✅ Compte supprimé. Redirection...', 'success');

        secureLogger.info('Account deleted successfully');

        // Wait 2 seconds then logout
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/';
        }, 2000);
      }
    } catch (error) {
      secureLogger.error('Account deletion failed', {
        error: error.message
      });

      if (error.response?.status === 401) {
        showNotification?.('❌ Mot de passe incorrect', 'error');
      } else {
        showNotification?.('❌ Erreur lors de la suppression du compte', 'error');
      }

      setIsDeleting(false);
    }
  };

  // ============================================================================
  // VIEW AUDIT TRAIL
  // ============================================================================

  const handleViewAuditTrail = async () => {
    try {
      const response = await apiAdapter.get('/gdpr/audit-trail?limit=50');

      if (response.data?.success && response.data.logs) {
        // Display audit trail in a modal or new page
        // For now, just log to console and show notification
        console.table(response.data.logs);

        showNotification?.(
          `📊 ${response.data.logs.length} actions GDPR trouvées. Voir la console.`,
          'info'
        );

        secureLogger.info('Audit trail fetched', {
          count: response.data.logs.length
        });
      }
    } catch (error) {
      secureLogger.error('Audit trail fetch failed', {
        error: error.message
      });
      showNotification?.('❌ Erreur lors de la récupération de l\'historique', 'error');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* GDPR Header */}
      <div className={`glass-effect p-4 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🔒</span>
          <div>
            <h3 className={`text-lg font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Protection des Données (RGPD)
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Gérez vos données personnelles selon le RGPD
            </p>
          </div>
        </div>
      </div>

      {/* Export Data (Article 15) */}
      <div className={`glass-effect p-6 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <span className="text-2xl">📦</span>
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Exporter mes données
            </h4>
            <p className={`text-sm mb-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Téléchargez toutes vos données personnelles au format JSON.
              Inclut votre profil, interactions, favoris, transactions et plus.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                isExporting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } shadow-lg hover:shadow-xl hover:scale-105`}
            >
              {isExporting ? '📥 Export en cours...' : '📥 Exporter mes données'}
            </button>
            <div className={`mt-3 text-xs ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              ⚠️ Limité à 3 exports par jour
            </div>
          </div>
        </div>
      </div>

      {/* View Audit Trail */}
      <div className={`glass-effect p-6 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <span className="text-2xl">📊</span>
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Historique d'audit
            </h4>
            <p className={`text-sm mb-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Consultez l'historique de toutes les actions RGPD effectuées sur votre compte
              (exports, suppressions, modifications).
            </p>
            <button
              onClick={handleViewAuditTrail}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                darkMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              } shadow-lg hover:shadow-xl hover:scale-105`}
            >
              📊 Voir l'historique
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account (Article 17) */}
      <div className={`glass-effect p-6 rounded-2xl border-2 ${
        darkMode
          ? 'glass-effect-dark border-red-700/50'
          : 'border-red-500/20'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-2 text-red-500">
              Supprimer mon compte
            </h4>
            <p className={`text-sm mb-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Action irréversible. Votre compte sera anonymisé et vos données personnelles
              supprimées. Les données financières seront anonymisées (obligation légale de conservation 7 ans).
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                🗑️ Supprimer mon compte
              </button>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-red-900/20' : 'bg-red-50'
                }`}>
                  <p className={`text-sm font-medium mb-3 ${
                    darkMode ? 'text-red-400' : 'text-red-700'
                  }`}>
                    ⚠️ Cette action est irréversible!
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Mot de passe
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                          darkMode
                            ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                            : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Tapez "DELETE MY ACCOUNT" pour confirmer
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="DELETE MY ACCOUNT"
                        className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                          darkMode
                            ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                            : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !deletePassword || deleteConfirmation !== 'DELETE MY ACCOUNT'}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      isDeleting || !deletePassword || deleteConfirmation !== 'DELETE MY ACCOUNT'
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
                    } shadow-lg`}
                  >
                    {isDeleting ? '🗑️ Suppression...' : '🗑️ Confirmer la suppression'}
                  </button>

                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteConfirmation('');
                    }}
                    disabled={isDeleting}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                    } shadow-lg hover:scale-105`}
                  >
                    ❌ Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GDPR Rights Info */}
      <div className={`glass-effect p-4 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-start space-x-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h4 className={`font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Vos droits RGPD
            </h4>
            <ul className={`text-sm space-y-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <li>• <strong>Article 15</strong> - Droit d'accès à vos données</li>
              <li>• <strong>Article 16</strong> - Droit de rectification</li>
              <li>• <strong>Article 17</strong> - Droit à l'effacement ("droit à l'oubli")</li>
              <li>• <strong>Article 20</strong> - Droit à la portabilité des données</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GDPRSettings;
