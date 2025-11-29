import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

const ImageWithPlaceholder = ({
    src,
    placeholderSrc,
    alt,
    className,
    imgClassName,
    loading = "lazy",
    decoding = "async",
    fetchPriority = "auto",
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        // Reset state when src changes
        setIsLoaded(false); // eslint-disable-line react-hooks/set-state-in-effect

        // Check if image is already loaded (e.g. from cache)
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
            setIsLoaded(true);
        }
    }, [src]);

    return (
        <div className={clsx("relative overflow-hidden", className)}>
            {/* Low Quality Placeholder */}
            <img
                src={placeholderSrc}
                alt={alt}
                className={clsx(
                    "absolute inset-0 w-full h-full transition-opacity duration-700",
                    imgClassName,
                    isLoaded ? "opacity-0" : "opacity-100 blur-xl scale-105"
                )}
                aria-hidden="true"
            />

            {/* High Quality Image */}
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                className={clsx(
                    "relative w-full h-full transition-opacity duration-700",
                    imgClassName,
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                loading={loading}
                decoding={decoding}
                fetchPriority={fetchPriority}
                onLoad={() => setIsLoaded(true)}
                onError={() => setIsLoaded(false)} // Keep placeholder if error
                {...props}
            />
        </div>
    );
};

export default ImageWithPlaceholder;
