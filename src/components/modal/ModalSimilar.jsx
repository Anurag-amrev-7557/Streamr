import { memo, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ImageWithPlaceholder from '../ImageWithPlaceholder';

const ModalSimilar = memo(({ similarMovies, isLoading, onMovieClick, onClose, isError, onRetry }) => {
    const handleMovieClick = useCallback((item) => {
        if (onMovieClick) {
            onClose();
            // Immediate navigation without artificial delay
            onMovieClick(item);
        }
    }, [onMovieClick, onClose]);

    return (
        <div
            className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}
        >
            {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-white/5 animate-pulse rounded-lg"></div>
                ))
            ) : isError ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 gap-4">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <div className="text-center">
                        <p className="text-gray-300 font-semibold mb-1">Failed to load similar content</p>
                        <p className="text-sm text-gray-500">Please check your connection and try again</p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition border border-white/20 hover:border-white/30"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    )}
                </div>
            ) : similarMovies.length > 0 ? (
                similarMovies.map((item, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        onClick={() => handleMovieClick(item)}
                        className="group relative aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg overflow-hidden cursor-pointer transition ring ring-white/10 hover:ring-white/30 transition duration-200"
                    >
                        {item.poster_path ? (
                            <ImageWithPlaceholder
                                src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                                placeholderSrc={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={item.title || item.name}
                                className="w-full h-full"
                                imgClassName="object-cover"
                                loading={index < 4 ? "eager" : "lazy"}
                                fetchPriority={index < 4 ? "high" : "low"}
                                decoding="async"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                                No Image
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="col-span-full text-center text-gray-400 py-8">
                    No similar content available
                </div>
            )}
        </div>
    );
});

ModalSimilar.displayName = 'ModalSimilar';

export default ModalSimilar;

