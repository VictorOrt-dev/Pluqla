/**
 * Dashboard - Main Finance Dashboard Entry Point
 * Now using EnhancedDashboard (Money Manager + Pluqla DA + Pluqi)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FinancialErrorBoundary } from '../common/ErrorBoundary';
import EnhancedDashboard from './enhanced/EnhancedDashboard';

const Dashboard = ({ darkMode }) => {
  return (
    <FinancialErrorBoundary componentName="Dashboard">
      <EnhancedDashboard darkMode={darkMode} />
    </FinancialErrorBoundary>
  );
};

Dashboard.propTypes = {
  darkMode: PropTypes.bool
};

export default Dashboard;
