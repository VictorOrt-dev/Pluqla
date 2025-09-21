import React from 'react';
import { Line } from 'react-chartjs-2';
import '../../../utils/chartSetup'; // Import centralisé pour Chart.js
import { useTranslation } from 'react-i18next';

const NetWorthTrendChart = ({ data, darkMode }) => {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-6xl mb-4">📈</div>
        <p className="text-center">
          {t('financial.charts.noTrendData')}
        </p>
        <p className="text-sm text-center mt-2">
          {t('financial.charts.needMoreSnapshots')}
        </p>
      </div>
    );
  }

  // Sort data by date
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Prepare chart data
  const chartData = {
    labels: sortedData.map(point =>
      new Date(point.date).toLocaleDateString('fr-FR', {
        month: 'short',
        year: '2-digit'
      })
    ),
    datasets: [
      {
        label: t('financial.netWorth.title'),
        data: sortedData.map(point => point.netWorth),
        borderColor: '#3B82F6',
        backgroundColor: darkMode
          ? 'rgba(59, 130, 246, 0.1)'
          : 'rgba(59, 130, 246, 0.05)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#1D4ED8',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3
      },
      {
        label: t('financial.totalAssets'),
        data: sortedData.map(point => point.totalAssets),
        borderColor: '#10B981',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        tension: 0.4
      },
      {
        label: t('financial.totalLiabilities'),
        data: sortedData.map(point => point.totalLiabilities),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#ffffff',
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: darkMode ? '#D1D5DB' : '#374151',
          font: {
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'line'
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
          title: function(context) {
            const dataIndex = context[0].dataIndex;
            const date = new Date(sortedData[dataIndex].date);
            return date.toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;

            return `${label}: ${new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0
            }).format(value)}`;
          },
          afterBody: function(context) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              const current = sortedData[dataIndex];
              const previous = dataIndex > 0 ? sortedData[dataIndex - 1] : null;

              if (previous) {
                const change = current.netWorth - previous.netWorth;
                const changePercent = ((change / Math.abs(previous.netWorth)) * 100).toFixed(1);
                const changeText = change >= 0 ? '↗️' : '↘️';

                return [
                  '',
                  `${changeText} ${t('financial.changeFromPrevious')}: ${new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 0
                  }).format(Math.abs(change))} (${changePercent}%)`
                ];
              }
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: darkMode ? '#374151' : '#F3F4F6',
          borderColor: darkMode ? '#4B5563' : '#D1D5DB'
        },
        ticks: {
          color: darkMode ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: darkMode ? '#374151' : '#F3F4F6',
          borderColor: darkMode ? '#4B5563' : '#D1D5DB'
        },
        ticks: {
          color: darkMode ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11
          },
          callback: function(value) {
            return new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              notation: 'compact',
              minimumFractionDigits: 0
            }).format(value);
          }
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    }
  };

  // Calculate trend statistics
  const latest = sortedData[sortedData.length - 1];
  const oldest = sortedData[0];
  const totalChange = latest.netWorth - oldest.netWorth;
  const totalChangePercent = oldest.netWorth !== 0
    ? ((totalChange / Math.abs(oldest.netWorth)) * 100).toFixed(1)
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = () => {
    if (totalChange > 0) return '📈';
    if (totalChange < 0) return '📉';
    return '➖';
  };

  const getTrendColor = () => {
    if (totalChange > 0) return 'text-green-600';
    if (totalChange < 0) return 'text-red-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-4">
      {/* Chart Container */}
      <div className="relative h-64">
        <Line data={chartData} options={options} />
      </div>

      {/* Trend Summary */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {t('financial.trendSummary')}
          </h4>
          <div className="flex items-center space-x-1">
            <span className="text-lg">{getTrendIcon()}</span>
            <span className={`text-sm font-semibold ${getTrendColor()}`}>
              {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('financial.periodGrowth')}
            </p>
            <p className={`font-semibold ${getTrendColor()}`}>
              {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent}%
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('financial.dataPoints')}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {sortedData.length} {t('financial.snapshots')}
            </p>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {(() => {
              if (sortedData.length < 2) {
                return t('financial.insights.needMoreData');
              }

              const avgGrowth = totalChange / (sortedData.length - 1);

              if (avgGrowth > 0) {
                return `💡 ${t('financial.insights.positiveGrowth', {
                  amount: formatCurrency(Math.abs(avgGrowth))
                })}`;
              } else if (avgGrowth < 0) {
                return `⚠️ ${t('financial.insights.negativeGrowth', {
                  amount: formatCurrency(Math.abs(avgGrowth))
                })}`;
              } else {
                return `📊 ${t('financial.insights.stableNetWorth')}`;
              }
            })()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NetWorthTrendChart;