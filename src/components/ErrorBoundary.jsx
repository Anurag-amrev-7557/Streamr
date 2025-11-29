import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white p-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 text-[#E50914]">Oops!</h1>
                    <h2 className="text-xl md:text-2xl font-semibold mb-6">Something went wrong.</h2>
                    <p className="text-gray-400 max-w-md mb-8">
                        We're sorry, but an unexpected error has occurred. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
                    >
                        Refresh Page
                    </button>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-12 p-4 bg-gray-900 rounded text-left overflow-auto max-w-3xl w-full border border-gray-800">
                            <p className="text-red-400 font-mono text-sm mb-2">{this.state.error.toString()}</p>
                            <pre className="text-gray-500 font-mono text-xs whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
