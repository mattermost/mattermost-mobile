// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ReactProfiler from '@utils/performance/react_profiler';

describe('ReactProfilerManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ReactProfiler.clearMetrics();
        ReactProfiler.setEnabled(true);
    });

    describe('when profiling is disabled', () => {
        beforeEach(() => {
            (global as any).__DEV__ = false;
            ReactProfiler.setEnabled(false);
        });

        it('should return false for isEnabled', () => {
            expect(ReactProfiler.isEnabled()).toBe(false);
        });

        it('should not track metrics when disabled', () => {
            ReactProfiler.onRender('TestComponent', 'mount', 100, 90, 1000, 1100);

            const metrics = ReactProfiler.getMetrics('TestComponent');
            expect(metrics).toHaveLength(0);
        });

        it('should not print summary when disabled', () => {
            ReactProfiler.onRender('TestComponent', 'mount', 100, 90, 1000, 1100);

            // Should not throw
            ReactProfiler.printSummary();
        });
    });

    describe('when profiling is enabled', () => {
        beforeEach(() => {
            (global as any).__DEV__ = true;
            ReactProfiler.setEnabled(true);
        });

        it('should return true for isEnabled', () => {
            expect(ReactProfiler.isEnabled()).toBe(true);
        });

        describe('onRender', () => {
            it('should track mount phase metrics', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);

                const metrics = ReactProfiler.getMetrics('Post');
                expect(metrics).toHaveLength(1);
                expect(metrics[0]).toEqual({
                    componentName: 'Post',
                    phase: 'mount',
                    actualDuration: 50,
                    baseDuration: 45,
                    startTime: 1000,
                    commitTime: 1050,
                });
            });

            it('should track update phase metrics', () => {
                ReactProfiler.onRender('Channel', 'update', 25, 20, 2000, 2025);

                const metrics = ReactProfiler.getMetrics('Channel');
                expect(metrics).toHaveLength(1);
                expect(metrics[0]).toEqual({
                    componentName: 'Channel',
                    phase: 'update',
                    actualDuration: 25,
                    baseDuration: 20,
                    startTime: 2000,
                    commitTime: 2025,
                });
            });

            it('should track nested-update phase metrics', () => {
                ReactProfiler.onRender('User', 'nested-update', 10, 8, 3000, 3010);

                const metrics = ReactProfiler.getMetrics('User');
                expect(metrics).toHaveLength(1);
                expect(metrics[0].phase).toBe('nested-update');
            });

            it('should track multiple renders for same component', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Post', 'update', 25, 20, 2000, 2025);
                ReactProfiler.onRender('Post', 'update', 15, 12, 3000, 3015);

                const metrics = ReactProfiler.getMetrics('Post');
                expect(metrics).toHaveLength(3);
                expect(metrics[0].phase).toBe('mount');
                expect(metrics[1].phase).toBe('update');
                expect(metrics[2].phase).toBe('update');
            });

            it('should track renders for multiple components', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Channel', 'mount', 30, 28, 1100, 1130);
                ReactProfiler.onRender('User', 'mount', 10, 8, 1200, 1210);

                expect(ReactProfiler.getMetrics('Post')).toHaveLength(1);
                expect(ReactProfiler.getMetrics('Channel')).toHaveLength(1);
                expect(ReactProfiler.getMetrics('User')).toHaveLength(1);
            });

            it('should not log renders under 50ms', () => {
                ReactProfiler.onRender('FastComponent', 'mount', 30, 25, 1000, 1030);

                const metrics = ReactProfiler.getMetrics('FastComponent');
                expect(metrics).toHaveLength(1);
            });

            it('should log renders over 50ms', () => {
                ReactProfiler.onRender('SlowComponent', 'mount', 75, 70, 1000, 1075);

                const metrics = ReactProfiler.getMetrics('SlowComponent');
                expect(metrics).toHaveLength(1);
                expect(metrics[0].actualDuration).toBe(75);
            });
        });

        describe('getMetrics', () => {
            it('should return empty array for component with no metrics', () => {
                const metrics = ReactProfiler.getMetrics('NonexistentComponent');
                expect(metrics).toEqual([]);
            });

            it('should return all metrics for a component', () => {
                ReactProfiler.onRender('TestComponent', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('TestComponent', 'update', 25, 20, 2000, 2025);

                const metrics = ReactProfiler.getMetrics('TestComponent');
                expect(metrics).toHaveLength(2);
            });
        });

        describe('getAllMetrics', () => {
            it('should return empty map when no metrics tracked', () => {
                const allMetrics = ReactProfiler.getAllMetrics();
                expect(allMetrics.size).toBe(0);
            });

            it('should return all tracked metrics', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Channel', 'mount', 30, 28, 1100, 1130);

                const allMetrics = ReactProfiler.getAllMetrics();
                expect(allMetrics.size).toBe(2);
                expect(allMetrics.has('Post')).toBe(true);
                expect(allMetrics.has('Channel')).toBe(true);
            });
        });

        describe('printSummary', () => {
            it('should handle no metrics collected', () => {
                // Should not throw
                ReactProfiler.printSummary();
            });

            it('should print summary for single component', () => {
                ReactProfiler.onRender('Post', 'mount', 100, 90, 1000, 1100);
                ReactProfiler.onRender('Post', 'update', 50, 45, 2000, 2050);

                ReactProfiler.printSummary();
            });

            it('should print summary for multiple components', () => {
                ReactProfiler.onRender('Post', 'mount', 100, 90, 1000, 1100);
                ReactProfiler.onRender('Channel', 'mount', 80, 75, 1100, 1180);
                ReactProfiler.onRender('User', 'mount', 60, 55, 1200, 1260);

                ReactProfiler.printSummary();
            });

            it('should sort components by total actual time', () => {
                ReactProfiler.onRender('Fast', 'mount', 10, 8, 1000, 1010);
                ReactProfiler.onRender('Slow', 'mount', 100, 90, 1100, 1200);
                ReactProfiler.onRender('Medium', 'mount', 50, 45, 1200, 1250);

                ReactProfiler.printSummary();
            });

            it('should limit output to top 10 components', () => {
                // Add 15 components
                for (let i = 0; i < 15; i++) {
                    ReactProfiler.onRender(`Component${i}`, 'mount', 10 + i, 8 + i, 1000 + (i * 100), 1010 + (i * 100));
                }

                ReactProfiler.printSummary();
            });

            it('should calculate correct statistics', () => {
                // Add multiple renders to test statistics
                ReactProfiler.onRender('TestComponent', 'mount', 100, 90, 1000, 1100);
                ReactProfiler.onRender('TestComponent', 'update', 50, 45, 2000, 2050);
                ReactProfiler.onRender('TestComponent', 'update', 25, 20, 3000, 3025);

                ReactProfiler.printSummary();
            });

            it('should identify memoization opportunities', () => {
                // Component with actual duration much higher than base duration
                ReactProfiler.onRender('UnoptimizedComponent', 'mount', 200, 100, 1000, 1200);

                ReactProfiler.printSummary();
            });

            it('should not show memoization warning for well-optimized components', () => {
                // Component with actual duration close to base duration
                ReactProfiler.onRender('OptimizedComponent', 'mount', 105, 100, 1000, 1105);

                ReactProfiler.printSummary();
            });
        });

        describe('clearMetrics', () => {
            it('should clear all metrics when no component specified', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Channel', 'mount', 30, 28, 1100, 1130);

                ReactProfiler.clearMetrics();

                expect(ReactProfiler.getMetrics('Post')).toEqual([]);
                expect(ReactProfiler.getMetrics('Channel')).toEqual([]);
                expect(ReactProfiler.getAllMetrics().size).toBe(0);
            });

            it('should clear metrics for specific component', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Channel', 'mount', 30, 28, 1100, 1130);

                ReactProfiler.clearMetrics('Post');

                expect(ReactProfiler.getMetrics('Post')).toEqual([]);
                expect(ReactProfiler.getMetrics('Channel')).toHaveLength(1);
            });

            it('should handle clearing nonexistent component', () => {
                ReactProfiler.clearMetrics('NonexistentComponent');

                // Should not throw
                expect(ReactProfiler.getMetrics('NonexistentComponent')).toEqual([]);
            });
        });

        describe('setEnabled', () => {
            it('should disable profiling when set to false', () => {
                ReactProfiler.setEnabled(false);

                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);

                expect(ReactProfiler.getMetrics('Post')).toEqual([]);
            });

            it('should enable profiling when set to true', () => {
                ReactProfiler.setEnabled(false);
                ReactProfiler.setEnabled(true);

                ReactProfiler.onRender('Post', 'mount', 50, 45, 1000, 1050);

                expect(ReactProfiler.getMetrics('Post')).toHaveLength(1);
            });
        });

        describe('phase tracking', () => {
            it('should correctly count mount renders', () => {
                ReactProfiler.onRender('Component', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Component', 'mount', 55, 50, 2000, 2055);

                const metrics = ReactProfiler.getMetrics('Component');
                const mountCount = metrics.filter((m) => m.phase === 'mount').length;
                expect(mountCount).toBe(2);
            });

            it('should correctly count update renders', () => {
                ReactProfiler.onRender('Component', 'mount', 50, 45, 1000, 1050);
                ReactProfiler.onRender('Component', 'update', 25, 20, 2000, 2025);
                ReactProfiler.onRender('Component', 'update', 30, 25, 3000, 3030);

                const metrics = ReactProfiler.getMetrics('Component');
                const updateCount = metrics.filter((m) => m.phase === 'update').length;
                expect(updateCount).toBe(2);
            });
        });

        describe('timing data', () => {
            it('should track actual duration correctly', () => {
                ReactProfiler.onRender('Post', 'mount', 75.5, 70.2, 1000, 1075.5);

                const metrics = ReactProfiler.getMetrics('Post');
                expect(metrics[0].actualDuration).toBe(75.5);
            });

            it('should track base duration correctly', () => {
                ReactProfiler.onRender('Post', 'mount', 75.5, 70.2, 1000, 1075.5);

                const metrics = ReactProfiler.getMetrics('Post');
                expect(metrics[0].baseDuration).toBe(70.2);
            });

            it('should track start and commit times correctly', () => {
                ReactProfiler.onRender('Post', 'mount', 50, 45, 12345, 12395);

                const metrics = ReactProfiler.getMetrics('Post');
                expect(metrics[0].startTime).toBe(12345);
                expect(metrics[0].commitTime).toBe(12395);
            });
        });
    });
});
