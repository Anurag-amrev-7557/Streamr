import { useState, useEffect, useRef, useMemo } from 'react';
import { STREAMING_SERVICES, DEFAULT_STREAMING_SERVICE } from '../lib/constants';

/**
 * Hook to benchmark and select the fastest streaming source
 * @returns {Object} { bestSource, sourceLatencies, isChecking, sortedSources }
 */
export const useStreamSources = () => {
    // Initialize with stored preference or default
    const [bestSource, setBestSource] = useState(() => {
        return localStorage.getItem('preferredService') || DEFAULT_STREAMING_SERVICE;
    });

    const [sourceLatencies, setSourceLatencies] = useState({});
    const [isChecking, setIsChecking] = useState(true);

    const hasCheckedRef = useRef(false);

    useEffect(() => {
        if (hasCheckedRef.current) return;
        hasCheckedRef.current = true;

        const checkLatencies = async () => {
            const services = Object.entries(STREAMING_SERVICES);
            const results = {};

            // We only check a subset to avoid flooding the network, 
            // or we could check them all. Let's check all but fail gracefully.
            const checks = services.map(async ([key, service]) => {
                const start = performance.now();
                try {
                    // We use a no-cors mode because we just want to measure connection time
                    // We don't care about the response content, just that the server is reachable
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                    await fetch(service.baseUrl, {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    const end = performance.now();
                    return { key, latency: end - start };
                } catch {
                    return { key, latency: 9999 }; // Penalize failed/slow sources
                }
            });

            // Wait for all checks to complete (or timeout)
            const resolvedChecks = await Promise.allSettled(checks);

            resolvedChecks.forEach(result => {
                if (result.status === 'fulfilled') {
                    results[result.value.key] = result.value.latency;
                }
            });

            setSourceLatencies(results);
            setIsChecking(false);

            // Determine winner if no user preference is set
            // Note: We responsibly respect the user's manual override if they have one.
            // But if they are on 'Auto' or we want to suggest, we calculate it here.
            // For this implementation, we will update the internal suggestion, 
            // but the consuming component decides whether to auto-switch.
        };

        // Run the check with a small delay to not block initial render
        const timer = setTimeout(checkLatencies, 100);
        return () => clearTimeout(timer);
    }, []);

    // Memoize the sorted list of sources based on latency
    const sortedSources = useMemo(() => {
        return Object.keys(STREAMING_SERVICES).sort((a, b) => {
            let latA = sourceLatencies[a] || 9999;
            let latB = sourceLatencies[b] || 9999;

            // Artificial bias: Favor MOVIES111 if it's reachable (latency < 9999)
            // We subtract 2000ms from its latency to make it win even if it's slightly slower
            if (a === 'MOVIES111' && latA < 9999) latA -= 2000;
            if (b === 'MOVIES111' && latB < 9999) latB -= 2000;

            return latA - latB;
        });
    }, [sourceLatencies]);

    // Derived best source from technical benchmarks
    // const fastestSource = sortedSources[0];

    return {
        currentSource: bestSource,
        setSource: setBestSource,
        sourceLatencies,
        isChecking,
        sortedSources,
        fastestSource: sortedSources[0]
    };
};
