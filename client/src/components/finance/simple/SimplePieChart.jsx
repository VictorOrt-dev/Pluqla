/**
 * SimplePieChart - Clean Donut Chart for Categories
 * No fancy interactions, just beautiful & readable
 */

import React from 'react';
import PropTypes from 'prop-types';
import '../../../utils/chartSetup';
import { Doughnut } from 'react-chartjs-2';

const SimplePieChart = ({ data, darkMode, colorScheme = 'red' }) => {
  const getCategoryColor = (category, index) => {
    if (colorScheme === 'red') {
      const colors = ['#F14545', '#FF6B6B', '#D73030', '#F85454', '#E63946', '#B83030'];
      return colors[index % colors.length];
    } else {
      const colors = ['#10B981', '#059669', '#0D9488', '#14B8A6', '#0F766E', '#115E59'];
      return colors[index % colors.length];
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [{
      data: data.map(item => item.amount),
      backgroundColor: data.map((item, index) => getCategoryColor(item.category, index) + 'DD'),
      borderColor: data.map((item, index) => getCategoryColor(item.category, index)),
      borderWidth: 3,
      hoverOffset: 8,
      hoverBorderWidth: 4
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: darkMode ? '#e5e7eb' : '#374151',
          font: {
            size: 12,
            weight: 600
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        titleColor: darkMode ? '#e5e7eb' : '#374151',
        bodyColor: darkMode ? '#e5e7eb' : '#374151',
        borderColor: darkMode ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = formatCurrency(context.raw);
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%' // Donut style
  };

  return (
    <div className={`mx-4 mb-4 p-6 rounded-3xl backdrop-blur-xl border ${
      darkMode
        ? 'bg-slate-800/50 border-slate-700'
        : 'bg-white/70 border-gray-200'
    } shadow-lg`}>
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

SimplePieChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    category: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired
  })).isRequired,
  darkMode: PropTypes.bool,
  colorScheme: PropTypes.oneOf(['red', 'green'])
};

export default SimplePieChart;
