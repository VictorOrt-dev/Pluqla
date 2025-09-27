import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Configuration globale pour Chart.js
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Configuration par défaut pour tous les graphiques
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.plugins.legend.display = true;
ChartJS.defaults.animation.duration = 1000;

export default ChartJS;