import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../utils/chartSetup'; // Import centralisé pour Chart.js
import { Doughnut, Bar } from 'react-chartjs-2';
import LoadingSpinner from '../common/LoadingSpinner';
// import { financialApi } from '../../services/financialApi';

const ExpensesChart = ({ data, darkMode, compact = false, detailed = false }) => {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period] = useState('month');

  const fetchDetailedExpenses = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Re-enable when financialApi import is fixed
      // const data = await financialApi.getExpenses(period, 100);
      // setExpenses(data?.expenses || []);
      setExpenses([]); // Temporary fallback
    } catch (error) {
      console.error('Error fetching detailed expenses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailed) {
      fetchDetailedExpenses();
    }
  }, [detailed, fetchDetailedExpenses]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getCategoryDisplayName = (category) => {
    const translations = {
      alimentation: t('categories.alimentation'),
      transport: t('categories.transport'),
      logement: t('categories.logement'),
      loisirs: t('categories.loisirs'),
      sante: t('categories.sante'),
      habits: t('categories.habits'),
      autres: t('categories.autres')
    };
    return translations[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      alimentation: '#F14545', // Pluqla Primary Red
      transport: '#FF6B6B', // Lighter red variant
      logement: '#D73030', // Darker red variant
      loisirs: '#F85454', // Medium red variant
      sante: '#E63946', // Health red
      habits: '#FF5A5A', // Habits red
      autres: '#B83030' // Other expenses dark red
    };
    return colors[category] || '#F14545'; // Default to Pluqla Red
  };

  const getSampleData = () => {
    return [
      { category: 'alimentation', amount: 450, count: 12 },
      { category: 'transport', amount: 280, count: 8 },
      { category: 'logement', amount: 120, count: 3 },
      { category: 'loisirs', amount: 180, count: 7 },
      { category: 'sante', amount: 85, count: 2 },
      { category: 'autres', amount: 95, count: 4 }
    ];
  };

  const getCategoryData = () => {
    const categoryData = data?.byCategory?.length > 0 ? data.byCategory : getSampleData();

    const sortedCategories = [...categoryData].sort((a, b) => b.amount - a.amount);

    return {
      labels: sortedCategories.map(cat => getCategoryDisplayName(cat.category)),
      datasets: [{
        data: sortedCategories.map(cat => cat.amount),
        backgroundColor: sortedCategories.map(cat => getCategoryColor(cat.category) + '90'), // More opaque for better visibility
        borderColor: sortedCategories.map(cat => getCategoryColor(cat.category)),
        borderWidth: 3,
        hoverOffset: 8,
        hoverBorderWidth: 4
      }]
    };
  };

  const getExpenseTrendData = () => {
    if (!expenses || expenses.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Group expenses by day for the last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const expensesByDay = expenses.reduce((acc, expense) => {
      const day = new Date(expense.date).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + expense.amount;
      return acc;
    }, {});

    return {
      labels: last30Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }),
      datasets: [{
        label: t('finance.dailyExpenses'),
        data: last30Days.map(date => expensesByDay[date] || 0),
        backgroundColor: '#F1454590', // Pluqla Red with opacity
        borderColor: '#F14545',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
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
            const percentage = ((context.raw / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
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
          color: darkMode ? '#9ca3af' : '#6b7280'
        },
        grid: {
          display: false
        }
      }
    }
  };

  const getSampleTotals = () => {
    const sampleData = getSampleData();
    return {
      total: sampleData.reduce((sum, cat) => sum + cat.amount, 0),
      count: sampleData.reduce((sum, cat) => sum + cat.count, 0)
    };
  };

  const totalExpenses = data?.total || getSampleTotals().total;
  const expenseCount = data?.count || getSampleTotals().count;

  return (
    <div className="h-full">
      {/* Summary Info */}
      {!compact && (
        <div className="mb-6">
          <div className={`text-sm font-medium ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {formatCurrency(totalExpenses)} • {expenseCount} transactions
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className={detailed ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>
            {/* Pie Chart */}
            <div>
              <div className={`relative ${compact ? 'h-48' : 'h-64'}`}>
                <Doughnut data={getCategoryData()} options={chartOptions} />
              </div>
            </div>

            {/* Trend Chart (only in detailed view) */}
            {detailed && (
              <div>
                <h4 className={`text-sm sm:text-md font-medium mb-3 sm:mb-4 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  {t('finance.expensesTrend')}
                </h4>
                <div className="relative h-56 sm:h-64">
                  <Bar data={getExpenseTrendData()} options={barChartOptions} />
                </div>
              </div>
            )}
          </div>

          {/* Category List */}
          {!compact && (
            <div className="mt-6">
              <h4 className={`text-md font-medium mb-3 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {t('finance.categoryBreakdown')}
              </h4>
              <div className="space-y-2">
                {(data?.byCategory?.length > 0 ? data.byCategory : getSampleData())
                  .sort((a, b) => b.amount - a.amount)
                  .map((category, index) => (
                    <div
                      key={category.category}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg ${
                        darkMode
                          ? 'bg-gray-800/50 hover:bg-gray-800'
                          : 'bg-gray-50 hover:bg-gray-100'
                      } transition-colors space-y-2 sm:space-y-0`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCategoryColor(category.category) }}
                        ></div>
                        <div className="min-w-0 flex-1">
                          <span className={`font-medium block truncate ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {getCategoryDisplayName(category.category)}
                          </span>
                          <span className={`text-sm block sm:hidden ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            ({category.count} {t('finance.transactions')})
                          </span>
                        </div>
                        <span className={`text-sm hidden sm:inline ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ({category.count} {t('finance.transactions')})
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className={`font-semibold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatCurrency(category.amount)}
                        </p>
                        <p className={`text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {((category.amount / totalExpenses) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Transactions (detailed view only) */}
          {detailed && expenses.length > 0 && (
            <div className="mt-6">
              <h4 className={`text-md font-medium mb-3 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {t('finance.recentExpenses')}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expenses.slice(0, 10).map((expense) => (
                  <div
                    key={expense.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg ${
                      darkMode
                        ? 'bg-gray-800/50'
                        : 'bg-gray-50'
                    } space-y-2 sm:space-y-0`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryColor(expense.category) }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {expense.description}
                        </p>
                        <p className={`text-sm truncate ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {getCategoryDisplayName(expense.category)}
                          {expense.merchant && ` • ${expense.merchant}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExpensesChart;