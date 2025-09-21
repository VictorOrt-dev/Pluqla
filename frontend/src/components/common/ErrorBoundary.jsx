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
      return <h1>Oups, une erreur est survenue.</h1>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;