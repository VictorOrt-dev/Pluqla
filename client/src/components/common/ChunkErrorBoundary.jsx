import React from 'react';

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a chunk loading error
    if (error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to import')) {
      return { hasError: true, error };
    }
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    // Log chunk loading errors specifically
    if (error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk')) {
      console.warn('Chunk loading error detected:', error, errorInfo);

      // Optionally attempt to reload the page after a short delay
      setTimeout(() => {
        if (this.state.hasError) {
          window.location.reload();
        }
      }, 1000);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Erreur de chargement
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Une erreur s'est produite lors du chargement des composants.
              Cela peut être dû à une mise à jour de l'application.
            </p>
            <div className="space-x-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Recharger la page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Détails de l'erreur (dev)
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;