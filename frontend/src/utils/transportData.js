import routesData from '../data/transport-routes.json';

export const getRoutes = () => {
  return routesData;
};

export const getRouteById = (id) => {
  return routesData.find(route => route.id === id);
};

export const calculateSavings = (option1, option2) => {
  return Math.abs(option1.cost - option2.cost);
};

export const calculateCO2Savings = (option1, option2) => {
  return Math.abs(option1.co2 - option2.co2);
};

export const getBestOption = (route, criteria = 'cost') => {
  switch (criteria) {
    case 'cost':
      return route.options.reduce((best, current) => 
        current.cost < best.cost ? current : best
      );
    case 'time':
      return route.options.reduce((best, current) => 
        current.duration < best.duration ? current : best
      );
    case 'eco':
      return route.options.reduce((best, current) => 
        current.co2 < best.co2 ? current : best
      );
    default:
      return route.options[0];
  }
};