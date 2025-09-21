import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import '../../../utils/chartSetup'; // Import centralisé pour Chart.js
import { useTranslation } from 'react-i18next';

const AssetAllocationChart = ({ data, darkMode }) => {
  const { t } = useTranslation();

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-center">
          {t('financial.charts.noData')}
        </p>
        <p className="text-sm text-center mt-2">
          {t('financial.charts.addAssetsFirst')}
        </p>
      </div>
    );
  }

  // Color mapping for different asset types
  const assetColors = {
    stock: '#3B82F6',     // Blue
    crypto: '#F59E0B',    // Yellow
    real_estate: '#10B981', // Green
    bond: '#6366F1',      // Indigo
    etf: '#8B5CF6',       // Purple
    commodity: '#EF4444', // Red
    cash: '#6B7280',      // Gray
    checking: '#6B7280',  // Gray
    savings: '#059669'    // Emerald
  };

  // Prepare chart data
  const chartData = {
    labels: Object.keys(data).map(type => t(`financial.assetTypes.${type}`)),
    datasets: [
      {
        data: Object.values(data),
        backgroundColor: Object.keys(data).map(type => assetColors[type] || '#6B7280'),
        borderColor: darkMode ? '#374151' : '#ffffff',
        borderWidth: 2,
        hoverBackgroundColor: Object.keys(data).map(type => {
          const color = assetColors[type] || '#6B7280';
          return color + 'CC'; // Add transparency on hover
        }),
        hoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: darkMode ? '#D1D5DB' : '#374151',
          font: {
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1F2937' : '#ffffff',
        titleColor: darkMode ? '#F9FAFB' : '#111827',
        bodyColor: darkMode ? '#D1D5DB' : '#374151',
        borderColor: darkMode ? '#374151' : '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);

            return `${label}: ${new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0
            }).format(value)} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%', // Creates the doughnut hole
    elements: {
      arc: {
        borderRadius: 4
      }
    },
    animation: {
      animateRotate: true,
      duration: 1000
    }
  };

  // Calculate total value and percentages
  const totalValue = Object.values(data).reduce((sum, value) => sum + value, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Chart Container */}
      <div className="relative h-64">
        <Doughnut data={chartData} options={options} />

        {/* Center Value Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('financial.total')}
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {Object.entries(data)
          .sort(([,a], [,b]) => b - a) // Sort by value descending
          .map(([type, value]) => {
            const percentage = ((value / totalValue) * 100).toFixed(1);
            const color = assetColors[type] || '#6B7280';

            return (
              <div key={type} className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(`financial.assetTypes.${type}`)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(value)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {percentage}%
                  </p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Asset Allocation Insights */}
      {totalValue > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('financial.allocationInsights')}
          </h4>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {(() => {
              const entries = Object.entries(data).sort(([,a], [,b]) => b - a);
              const largestAsset = entries[0];
              const largestPercentage = ((largestAsset[1] / totalValue) * 100).toFixed(1);

              if (largestPercentage > 70) {
                return (
                  <p>⚠️ {t('financial.insights.overConcentrated', {
                    type: t(`financial.assetTypes.${largestAsset[0]}`),
                    percentage: largestPercentage
                  })}</p>
                );
              } else if (entries.length >= 3) {
                return (
                  <p>✅ {t('financial.insights.wellDiversified')}</p>
                );
              } else {
                return (
                  <p>💡 {t('financial.insights.considerDiversification')}</p>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetAllocationChart;