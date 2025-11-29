/**
 * Optimized Image Component with Advanced Caching
 * Implements lazy loading, blur placeholder, and multi-tier caching
 */

import { useState, useEffect, useRef, memo } from 'react';
import { imageCache } from '../utils/cache';
import { indexedDBCache, STORES } from '../utils/indexedDBCache';

const CachedImage = memo(({
    src,
    alt,
    className = '',
    loading = 'lazy',
    decoding = 'async',
    onLoad,
    onError,
    // placeholder = 'blur', // unused
    ...props
}) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const imgRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const loadImage = async () => {
            if (!src) return;

            // 1. Check memory cache first (fastest)
            const memoryCached = imageCache.get(src);
            if (memoryCached) {
                if (mounted) {
                    setImageSrc(memoryCached);
                    setIsLoading(false);
                }
                return;
            }

            // 2. Check IndexedDB (persistent cache)
            try {
                const dbCached = await indexedDBCache.get(STORES.IMAGES, src);
                if (dbCached && mounted) {
                    setImageSrc(dbCached.dataUrl);
                    imageCache.set(src, dbCached.dataUrl);
                    setIsLoading(false);
                    return;
                }
            } catch (err) {
                console.warn('IndexedDB cache read failed:', err);
            }

            // 3. Load from network
            try {
                const response = await fetch(src);
                if (!response.ok) throw new Error('Image fetch failed');

                const blob = await response.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                if (mounted) {
                    setImageSrc(dataUrl);
                    setIsLoading(false);

                    // Cache in memory
                    imageCache.set(src, dataUrl);

                    // Cache in IndexedDB for persistence
                    try {
                        await indexedDBCache.set(STORES.IMAGES, {
                            url: src,
                            dataUrl,
                        });
                    } catch (err) {
                        console.warn('IndexedDB cache write failed:', err);
                    }
                }
            } catch (err) {
                console.error('Image load error:', err);
                if (mounted) {
                    setError(true);
                    setIsLoading(false);
                    onError?.();
                }
            }
        };

        // Use Intersection Observer for lazy loading
        if (loading === 'lazy' && 'IntersectionObserver' in window) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadImage();
                        observerRef.current?.disconnect();
                    }
                },
                {
                    rootMargin: '50px',
                    threshold: 0.01,
                }
            );

            if (imgRef.current) {
                observerRef.current.observe(imgRef.current);
            }
        } else {
            loadImage();
        }

        return () => {
            mounted = false;
            observerRef.current?.disconnect();
        };
    }, [src, loading, onError]);

    const handleLoad = () => {
        setIsLoading(false);
        onLoad?.();
    };

    // Show placeholder while loading
    if (isLoading || !imageSrc) {
        return (
            <div
                ref={imgRef}
                className={`${className} bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse`}
                {...props}
            />
        );
    }

    // Show error state
    if (error) {
        return (
            <div
                className={`${className} bg-gray-800 flex items-center justify-center text-gray-600 text-sm`}
                {...props}
            >
                Failed to load
            </div>
        );
    }

    return (
        <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className={className}
            loading={loading}
            decoding={decoding}
            onLoad={handleLoad}
            {...props}
        />
    );
}, (prevProps, nextProps) => {
    return prevProps.src === nextProps.src &&
        prevProps.className === nextProps.className;
});

CachedImage.displayName = 'CachedImage';

export default CachedImage;
