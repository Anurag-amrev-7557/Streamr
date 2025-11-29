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
    }
};
