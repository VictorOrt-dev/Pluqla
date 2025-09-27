import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../utils/chartSetup'; // Import centralisé pour Chart.js
import { Bar, Doughnut } from 'react-chartjs-2';

const IncomeChart = ({ data, darkMode, compact = false, detailed = false }) => {
  const { t } = useTranslation();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getIncomeTypeDisplayName = (type) => {
    const translations = {
      salary: t('income.types.salary'),
      freelance: t('income.types.freelance'),
      investment: t('income.types.investment'),
      rental: t('income.types.rental'),
      pension: t('income.types.pension'),
      other: t('income.types.other')
    };
    return translations[type] || type;
  };

  const getIncomeTypeColor = (type) => {
    const colors = {
      salary: '#22c55e',
      freelance: '#3b82f6',
      investment: '#f59e0b',
      rental: '#8b5cf6',
      pension: '#ef4444',
      other: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  const getFrequencyDisplayName = (frequency) => {
    const translations = {
      weekly: t('income.frequency.weekly'),
      monthly: t('income.frequency.monthly'),
      quarterly: t('income.frequency.quarterly'),
      annual: t('income.frequency.annual')
    };
    return translations[frequency] || frequency;
  };

  const getSampleIncomeData = () => {
    return [
      { id: 1, name: 'Salaire principal', type: 'salary', amount: 3200, frequency: 'monthly' },
      { id: 2, name: 'Freelance web', type: 'freelance', amount: 800, frequency: 'monthly' },
      { id: 3, name: 'Investissements', type: 'investment', amount: 150, frequency: 'monthly' },
      { id: 4, name: 'Location appartement', type: 'rental', amount: 600, frequency: 'monthly' }
    ];
  };

  const getIncomeByTypeData = () => {
    const incomeData = data?.sources?.length > 0 ? data.sources : getSampleIncomeData();

    // Group by type and calculate monthly equivalent
    const incomeByType = incomeData.reduce((acc, source) => {
      const factor = source.frequency === 'weekly' ? 4.33 :
                    source.frequency === 'annual' ? 1/12 :
                    source.frequency === 'quarterly' ? 1/3 : 1;
      const monthlyAmount = source.amount * factor;

      acc[source.type] = (acc[source.type] || 0) + monthlyAmount;
      return acc;
    }, {});

    const sortedTypes = Object.entries(incomeByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6); // Top 6 income types

    return {
      labels: sortedTypes.map(([type]) => getIncomeTypeDisplayName(type)),
      datasets: [{
        data: sortedTypes.map(([,amount]) => amount),
        backgroundColor: sortedTypes.map(([type]) => getIncomeTypeColor(type)),
        borderColor: darkMode ? '#1f2937' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
  };

  const getIncomeSourcesData = () => {
    const incomeData = data?.sources?.length > 0 ? data.sources : getSampleIncomeData();

    const sources = incomeData
      .map(source => {
        const factor = source.frequency === 'weekly' ? 4.33 :
                      source.frequency === 'annual' ? 1/12 :
                      source.frequency === 'quarterly' ? 1/3 : 1;
        return {
          ...source,
          monthlyAmount: source.amount * factor
        };
      })
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, 8); // Top 8 sources

    return {
      labels: sources.map(source => source.name.length > 20 ?
        source.name.substring(0, 20) + '...' : source.name),
      datasets: [{
        label: t('income.monthlyAmount'),
        data: sources.map(source => source.monthlyAmount),
        backgroundColor: sources.map(source => getIncomeTypeColor(source.type)),
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: compact ? 'bottom' : 'right',
        labels: {
          color: darkMode ? '#e5e7eb' : '#374151',
          font: {
            size: compact ? 11 : 12
          },
          padding: compact ? 10 : 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        titleColor: darkMode ? '#e5e7eb' : '#374151',
        bodyColor: darkMode ? '#e5e7eb' : '#374151',
        borderColor: darkMode ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = formatCurrency(context.raw);
            if (context.chart.data.datasets[0].data.length > 1) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${value} (${percentage}%)`;
            }
            return `${context.label}: ${value}`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        titleColor: darkMode ? '#e5e7eb' : '#374151',
        bodyColor: darkMode ? '#e5e7eb' : '#374151',
        borderColor: darkMode ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return formatCurrency(context.raw);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          callback: function(value) {
            return formatCurrency(value);
          }
        },
        grid: {
          color: darkMode ? '#374151' : '#e5e7eb'
        }
      },
      x: {
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          maxRotation: 45
        },
        grid: {
          display: false
        }
      }
    }
  };

  const getSampleTotals = () => {
    const sampleData = getSampleIncomeData();
    return {
      total: sampleData.reduce((sum, source) => sum + source.amount, 0),
      count: sampleData.length
    };
  };

  const totalIncome = data?.total || getSampleTotals().total;
  const sourcesCount = data?.sources?.length || getSampleTotals().count;

  return (
    <div className={`rounded-xl p-4 sm:p-6 transition-all duration-300 ${
      darkMode
        ? 'bg-gray-900 border border-gray-700'
        : 'bg-white border border-gray-200'
    } shadow-lg`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h3 className={`text-base sm:text-lg font-semibold truncate ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {detailed ? 'Analyse des Revenus' : 'Revenus'}
          </h3>
          <p className={`text-xs sm:text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {formatCurrency(totalIncome)} • {sourcesCount} {t('income.sources')}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className={detailed ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>
        {/* Income by Type (Doughnut) */}
        <div>
          <h4 className={`text-md font-medium mb-4 ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {t('income.byType')}
          </h4>
          <div className={`relative ${compact ? 'h-48' : 'h-64'}`}>
            <Doughnut data={getIncomeByTypeData()} options={chartOptions} />
          </div>
        </div>

        {/* Income Sources (Bar Chart - detailed view only) */}
        {detailed && (
          <div>
            <h4 className={`text-md font-medium mb-4 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              {t('income.sourceBreakdown')}
            </h4>
            <div className="relative h-64">
              <Bar data={getIncomeSourcesData()} options={barChartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Income Sources List */}
      {!compact && (
        <div className="mt-6">
          <h4 className={`text-md font-medium mb-3 ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {t('income.sourcesList')}
          </h4>
          <div className="space-y-2">
            {(data?.sources?.length > 0 ? data.sources : getSampleIncomeData())
              .map(source => {
                const factor = source.frequency === 'weekly' ? 4.33 :
                              source.frequency === 'annual' ? 1/12 :
                              source.frequency === 'quarterly' ? 1/3 : 1;
                return {
                  ...source,
                  monthlyAmount: source.amount * factor
                };
              })
              .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
              .map((source) => (
                <div
                  key={source.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg ${
                    darkMode
                      ? 'bg-gray-800/50 hover:bg-gray-800'
                      : 'bg-gray-50 hover:bg-gray-100'
                  } transition-colors space-y-2 sm:space-y-0`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getIncomeTypeColor(source.type) }}
                    ></div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {source.name}
                      </p>
                      <p className={`text-sm truncate ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {getIncomeTypeDisplayName(source.type)} • {getFrequencyDisplayName(source.frequency)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={`font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {formatCurrency(source.monthlyAmount)}
                    </p>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {t('income.perMonth')}
                    </p>
                    {source.frequency !== 'monthly' && (
                      <p className={`text-xs ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        ({formatCurrency(source.amount)} {getFrequencyDisplayName(source.frequency)})
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default IncomeChart;