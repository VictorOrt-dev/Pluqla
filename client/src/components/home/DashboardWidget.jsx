import React from 'react';
import CircularProgress from '../common/CircularProgress';

const DashboardWidget = ({
  userData,
  progress,
  darkMode
}) => {
  return (
    <div className="flex flex-col items-center">
      {/* CircularProgress - Élément central épuré */}
      <CircularProgress
        amount={userData.savedAmount || 0}
        percentage={progress}
        size={165}
        goal={userData.monthlyGoal || 1000}
        darkMode={darkMode}
        animated={true}
        clickable={false}
      />
    </div>
  );
};

export default DashboardWidget;
