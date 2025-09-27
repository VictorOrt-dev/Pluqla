import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error Boundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Pluqla - Erreur</h1>
            <p className="mb-4 text-gray-600">Une erreur s'est produite dans l'application.</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Redémarrer l'application
            </button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
                <strong>Debug info:</strong> Vérifiez la console pour plus de détails.
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;