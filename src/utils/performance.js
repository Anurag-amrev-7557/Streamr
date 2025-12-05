/**
 * Performance monitoring utility using the User Timing API.
 * Safe to use in production (checks for window.performance support).
 */

export const performance = {
    /**
     * Mark a performance event
     * @param {string} name - The name of the mark
     */
    mark: (name) => {
        if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
            window.performance.mark(name);
        }
    },

    /**
     * Measure the time between two marks
     * @param {string} name - The name of the measure
     * @param {string} startMark - The name of the start mark
     * @param {string} endMark - The name of the end mark (optional, defaults to now)
     */
    measure: (name, startMark, endMark) => {
        if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
            try {
                window.performance.measure(name, startMark, endMark);
            } catch (e) {
                console.warn(`Performance measure failed: ${e.message}`);
            }
        }
    },

    /**
     * Clear marks and measures
     */
    clear: () => {
        if (typeof window !== 'undefined' && window.performance) {
            window.performance.clearMarks();
            window.performance.clearMeasures();
        }
    },

    /**
     * Initialize Web Vitals monitoring
     * @param {Function} onPerfEntry - Callback for performance entries
     */
    initWebVitals: (onPerfEntry) => {
        if (typeof window === 'undefined' || !onPerfEntry) return;

        try {
            // Observe LCP
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    onPerfEntry({
                        name: 'LCP',
                        value: entry.startTime,
                        id: 'LCP',
                    });
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // Observe FID
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    onPerfEntry({
                        name: 'FID',
                        value: entry.processingStart - entry.startTime,
                        id: 'FID',
                    });
                }
            }).observe({ type: 'first-input', buffered: true });

            // Observe CLS
            let clsValue = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        onPerfEntry({
                            name: 'CLS',
                            value: clsValue,
                            id: 'CLS',
                        });
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });

            // Observe Long Tasks
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    onPerfEntry({
                        name: 'LongTask',
                        value: entry.duration,
                        startTime: entry.startTime,
                        id: 'LongTask',
                    });
                }
            }).observe({ type: 'longtask', buffered: true });

        } catch (e) {
            console.warn('Web Vitals observation failed:', e);
        }
    }
};
