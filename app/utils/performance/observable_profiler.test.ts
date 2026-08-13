// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import performance from 'react-native-performance';
import {Subject} from 'rxjs';

import LocalConfig from '@assets/config.json';
import * as log from '@utils/log';
import observableProfiler from '@utils/performance/observable_profiler';

// Mock dependencies
jest.mock('react-native-performance', () => ({
    now: jest.fn(),
}));

jest.mock('@assets/config.json', () => ({
    EnableObserbvableProfiling: false,
}));

const mockPerformance = performance as jest.Mocked<typeof performance>;
const mockLogDebug = log.logDebug as jest.Mock;
const mockLogInfo = log.logInfo as jest.Mock;

describe('ObservableProfiler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPerformance.now.mockReturnValue(0);
        observableProfiler.clear();
        observableProfiler.setEnabled(false);
    });

    describe('when profiling is disabled', () => {
        beforeEach(() => {
            LocalConfig.EnableObservableProfiling = false;
            observableProfiler.setEnabled(false);
        });

        it('should not wrap observables when disabled', (done) => {
            const source$ = new Subject<number>();
            const wrapped$ = observableProfiler.profile(source$, 'testObs', 'TestComponent', 'comp123');

            // Should return the same observable without wrapping
            expect(wrapped$).toBe(source$);

            wrapped$.subscribe({
                next: (value) => {
                    expect(value).toBe(42);
                    expect(mockLogInfo).not.toHaveBeenCalled();
                    done();
                },
            });

            source$.next(42);
        });

        it('should return false for isEnabled', () => {
            expect(observableProfiler.isEnabled()).toBe(false);
        });

        it('should not track timing data', () => {
            const source$ = new Subject<number>();
            observableProfiler.profile(source$, 'testObs', 'TestComponent', 'comp123');
            source$.next(42);

            const timings = observableProfiler.getTimings('TestComponent', 'comp123');
            expect(timings).toBeUndefined();
        });
    });

    describe('when profiling is enabled', () => {
        beforeEach(() => {
            LocalConfig.EnableObservableProfiling = true;
            (global as any).__DEV__ = true;
            observableProfiler.setEnabled(true);
        });

        afterEach(() => {
            observableProfiler.clear();
        });

        it('should wrap observables and track subscription time', (done) => {
            mockPerformance.now.mockReturnValue(100);

            const source$ = new Subject<string>();
            const wrapped$ = observableProfiler.profile(source$, 'user', 'Post', 'post123');

            wrapped$.subscribe({
                next: () => {
                    const timings = observableProfiler.getTimings('Post', 'post123');
                    expect(timings).toBeDefined();
                    expect(timings).toHaveLength(1);
                    expect(timings![0].subscribeTime).toBe(100);
                    expect(timings![0].observableName).toBe('user');
                    expect(mockLogDebug).toHaveBeenCalledWith(
                        '[ObservableProfiler] Subscribed to user for Post:post123',
                    );
                    done();
                },
            });

            source$.next('value');
        });

        it('should track first emission timing', (done) => {
            mockPerformance.now.
                mockReturnValueOnce(100). // subscribe time
                mockReturnValueOnce(150); // first emit time

            const source$ = new Subject<number>();
            const wrapped$ = observableProfiler.profile(source$, 'channel', 'Post', 'post456');

            wrapped$.subscribe({
                next: () => {
                    const timings = observableProfiler.getTimings('Post', 'post456');
                    expect(timings![0].firstEmitTime).toBe(150);
                    expect(timings![0].timeToFirstEmit).toBe(50);
                    expect(timings![0].emitCount).toBe(1);
                    expect(mockLogInfo).toHaveBeenCalledWith(
                        '[ObservableProfiler] channel (Post:post456) FIRST EMIT after 50.00ms',
                    );
                    done();
                },
            });

            source$.next(1);
        });

        it('should track multiple emissions', (done) => {
            mockPerformance.now.
                mockReturnValueOnce(100). // subscribe
                mockReturnValueOnce(150). // first emit
                mockReturnValueOnce(200); // second emit

            const source$ = new Subject<string>();
            const wrapped$ = observableProfiler.profile(source$, 'post', 'Post', 'post789');

            let emitCount = 0;
            wrapped$.subscribe({
                next: () => {
                    emitCount++;
                    if (emitCount === 2) {
                        const timings = observableProfiler.getTimings('Post', 'post789');
                        expect(timings![0].emitCount).toBe(2);
                        expect(timings![0].lastEmitTime).toBe(200);
                        expect(mockLogInfo).toHaveBeenCalledWith(
                            expect.stringContaining('EMIT #2 at 100.00ms (+50.00ms)'),
                        );
                        done();
                    }
                },
            });

            source$.next('first');
            source$.next('second');
        });

        it('should track errors', (done) => {
            const source$ = new Subject<number>();
            const wrapped$ = observableProfiler.profile(source$, 'errorObs', 'Component', 'comp1');

            wrapped$.subscribe({
                error: (err) => {
                    expect(err.message).toBe('test error');
                    expect(mockLogDebug).toHaveBeenCalledWith(
                        '[ObservableProfiler] errorObs ERROR:',
                        err,
                    );
                    done();
                },
            });

            source$.error(new Error('test error'));
        });

        it('should track completion', (done) => {
            const source$ = new Subject<number>();
            const wrapped$ = observableProfiler.profile(source$, 'completeObs', 'Component', 'comp2');

            wrapped$.subscribe({
                complete: () => {
                    expect(mockLogDebug).toHaveBeenCalledWith(
                        '[ObservableProfiler] completeObs COMPLETED',
                    );
                    done();
                },
            });

            source$.complete();
        });

        it('should track multiple observables for same component', (done) => {
            mockPerformance.now.mockReturnValue(100);

            const source1$ = new Subject<number>();
            const source2$ = new Subject<string>();

            const wrapped1$ = observableProfiler.profile(source1$, 'obs1', 'Post', 'postABC');
            const wrapped2$ = observableProfiler.profile(source2$, 'obs2', 'Post', 'postABC');

            let doneCount = 0;
            const checkDone = () => {
                doneCount++;
                if (doneCount === 2) {
                    const timings = observableProfiler.getTimings('Post', 'postABC');
                    expect(timings).toHaveLength(2);
                    expect(timings![0].observableName).toBe('obs1');
                    expect(timings![1].observableName).toBe('obs2');
                    done();
                }
            };

            wrapped1$.subscribe({next: checkDone});
            wrapped2$.subscribe({next: checkDone});

            source1$.next(1);
            source2$.next('a');
        });

        it('should return all timings via getAllTimings', (done) => {
            const source1$ = new Subject<number>();
            const source2$ = new Subject<number>();

            const wrapped1$ = observableProfiler.profile(source1$, 'obs1', 'Component1', 'id1');
            const wrapped2$ = observableProfiler.profile(source2$, 'obs2', 'Component2', 'id2');

            let doneCount = 0;
            const checkDone = () => {
                doneCount++;
                if (doneCount === 2) {
                    const allTimings = observableProfiler.getAllTimings();
                    expect(allTimings.size).toBe(2);
                    expect(allTimings.has('Component1:id1')).toBe(true);
                    expect(allTimings.has('Component2:id2')).toBe(true);
                    done();
                }
            };

            wrapped1$.subscribe({next: checkDone});
            wrapped2$.subscribe({next: checkDone});

            source1$.next(1);
            source2$.next(2);
        });

        describe('analyzeComponent', () => {
            it('should handle no timing data', () => {
                observableProfiler.analyzeComponent('NoComponent', 'noId');
                expect(mockLogInfo).toHaveBeenCalledWith(
                    '[ObservableProfiler] No timing data for NoComponent:noId',
                );
            });

            it('should handle no emitted observables', (done) => {
                const source$ = new Subject<number>();
                observableProfiler.profile(source$, 'obs', 'TestComp', 'testId');

                // Subscribe but don't emit
                source$.subscribe({
                    next: () => {
                        // This won't be called
                    },
                });

                setTimeout(() => {
                    observableProfiler.analyzeComponent('TestComp', 'testId');
                    expect(mockLogInfo).toHaveBeenCalledWith('  No observables have emitted yet');
                    done();
                }, 10);
            });

            it('should analyze component with emitted observables', (done) => {
                mockPerformance.now.
                    mockReturnValueOnce(100). // subscribe obs1
                    mockReturnValueOnce(110). // subscribe obs2
                    mockReturnValueOnce(120). // emit obs1
                    mockReturnValueOnce(150); // emit obs2

                const source1$ = new Subject<number>();
                const source2$ = new Subject<number>();

                const wrapped1$ = observableProfiler.profile(source1$, 'fastObs', 'AnalyzeTest', 'analyze1');
                const wrapped2$ = observableProfiler.profile(source2$, 'slowObs', 'AnalyzeTest', 'analyze1');

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 2) {
                        observableProfiler.analyzeComponent('AnalyzeTest', 'analyze1');

                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('OBSERVABLE ANALYSIS'));
                        expect(mockLogInfo).toHaveBeenCalledWith('  Total Observables: 2');
                        expect(mockLogInfo).toHaveBeenCalledWith('  Emitted: 2 | Pending: 0');
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('EMISSION TIMELINE'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('SLOWEST OBSERVABLES'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('RESOLUTION PATTERN'));
                        done();
                    }
                };

                wrapped1$.subscribe({next: checkDone});
                wrapped2$.subscribe({next: checkDone});

                source1$.next(1);
                source2$.next(2);
            });

            it('should detect waterfall pattern', (done) => {
                // Create observables that resolve with large gaps (>5ms avg)
                mockPerformance.now.
                    mockReturnValueOnce(0). // subscribe obs1
                    mockReturnValueOnce(0). // subscribe obs2
                    mockReturnValueOnce(10). // emit obs1
                    mockReturnValueOnce(20); // emit obs2 (10ms gap)

                const source1$ = new Subject<number>();
                const source2$ = new Subject<number>();

                const wrapped1$ = observableProfiler.profile(source1$, 'obs1', 'Waterfall', 'w1');
                const wrapped2$ = observableProfiler.profile(source2$, 'obs2', 'Waterfall', 'w1');

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 2) {
                        observableProfiler.analyzeComponent('Waterfall', 'w1');
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('WATERFALL DETECTED'));
                        done();
                    }
                };

                wrapped1$.subscribe({next: checkDone});
                wrapped2$.subscribe({next: checkDone});

                source1$.next(1);
                source2$.next(2);
            });

            it('should detect batch pattern', (done) => {
                // Batch pattern: avgGap <= 5ms but maxGap > 20ms
                // Need many observables with small gaps plus one large gap
                // gaps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 26] -> avgGap = (9*1 + 26)/10 = 3.5ms < 5ms, maxGap = 26ms > 20ms
                mockPerformance.now.
                    mockReturnValueOnce(0). // subscribe all
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(0).
                    mockReturnValueOnce(10). // emit obs1
                    mockReturnValueOnce(11). // emit obs2 (1ms gap)
                    mockReturnValueOnce(12). // emit obs3 (1ms gap)
                    mockReturnValueOnce(13). // emit obs4 (1ms gap)
                    mockReturnValueOnce(14). // emit obs5 (1ms gap)
                    mockReturnValueOnce(15). // emit obs6 (1ms gap)
                    mockReturnValueOnce(16). // emit obs7 (1ms gap)
                    mockReturnValueOnce(17). // emit obs8 (1ms gap)
                    mockReturnValueOnce(18). // emit obs9 (1ms gap)
                    mockReturnValueOnce(19). // emit obs10 (1ms gap)
                    mockReturnValueOnce(45); // emit obs11 (26ms gap)

                const sources$ = Array.from({length: 11}, () => new Subject<number>());
                const wrappeds$ = sources$.map((s, i) => observableProfiler.profile(s, `obs${i + 1}`, 'Batch', 'b1'));

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 11) {
                        observableProfiler.analyzeComponent('Batch', 'b1');
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('BATCH PATTERN'));
                        done();
                    }
                };

                wrappeds$.forEach((w) => w.subscribe({next: checkDone}));
                sources$.forEach((s, i) => s.next(i + 1));
            });

            it('should detect parallel pattern', (done) => {
                // Create observables with small gaps (<5ms avg)
                mockPerformance.now.
                    mockReturnValueOnce(0). // subscribe obs1
                    mockReturnValueOnce(0). // subscribe obs2
                    mockReturnValueOnce(10). // emit obs1
                    mockReturnValueOnce(12); // emit obs2 (2ms gap)

                const source1$ = new Subject<number>();
                const source2$ = new Subject<number>();

                const wrapped1$ = observableProfiler.profile(source1$, 'obs1', 'Parallel', 'p1');
                const wrapped2$ = observableProfiler.profile(source2$, 'obs2', 'Parallel', 'p1');

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 2) {
                        observableProfiler.analyzeComponent('Parallel', 'p1');
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('PARALLEL'));
                        done();
                    }
                };

                wrapped1$.subscribe({next: checkDone});
                wrapped2$.subscribe({next: checkDone});

                source1$.next(1);
                source2$.next(2);
            });
        });

        describe('analyzeComponentsByPrefix', () => {
            it('should handle no component data', () => {
                observableProfiler.analyzeComponentsByPrefix('Post');
                expect(mockLogInfo).toHaveBeenCalledWith(
                    '[ObservableProfiler] No Post timing data available',
                );
            });

            it('should analyze all components and aggregate statistics', (done) => {
                mockPerformance.now.
                    mockReturnValueOnce(0). // post1 obs1 subscribe
                    mockReturnValueOnce(0). // post2 obs1 subscribe
                    mockReturnValueOnce(10). // post1 obs1 emit (10ms)
                    mockReturnValueOnce(20); // post2 obs1 emit (20ms)

                const source1$ = new Subject<number>();
                const source2$ = new Subject<number>();

                const wrapped1$ = observableProfiler.profile(source1$, 'userObs', 'Post', 'post1');
                const wrapped2$ = observableProfiler.profile(source2$, 'userObs', 'Post', 'post2');

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 2) {
                        observableProfiler.analyzeComponentsByPrefix('Post');

                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('POST OBSERVABLE ANALYSIS (2 components)'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('OBSERVABLE PERFORMANCE SUMMARY'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('TOP 3 OPTIMIZATION TARGETS'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringMatching(/userObs.*15\.0ms avg/));
                        done();
                    }
                };

                wrapped1$.subscribe({next: checkDone});
                wrapped2$.subscribe({next: checkDone});

                source1$.next(1);
                source2$.next(2);
            });

            it('should calculate percentiles correctly and work with different prefixes', (done) => {
                mockPerformance.now.
                    mockReturnValueOnce(0). // channel1 subscribe
                    mockReturnValueOnce(0). // channel2 subscribe
                    mockReturnValueOnce(0). // channel3 subscribe
                    mockReturnValueOnce(10). // channel1 emit (10ms)
                    mockReturnValueOnce(20). // channel2 emit (20ms)
                    mockReturnValueOnce(30); // channel3 emit (30ms)

                const source1$ = new Subject<number>();
                const source2$ = new Subject<number>();
                const source3$ = new Subject<number>();

                const wrapped1$ = observableProfiler.profile(source1$, 'posts', 'Channel', 'c1');
                const wrapped2$ = observableProfiler.profile(source2$, 'posts', 'Channel', 'c2');
                const wrapped3$ = observableProfiler.profile(source3$, 'posts', 'Channel', 'c3');

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 3) {
                        observableProfiler.analyzeComponentsByPrefix('Channel');
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('CHANNEL OBSERVABLE ANALYSIS'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringMatching(/posts.*20\.0ms.*20\.0ms/));
                        done();
                    }
                };

                wrapped1$.subscribe({next: checkDone});
                wrapped2$.subscribe({next: checkDone});
                wrapped3$.subscribe({next: checkDone});

                source1$.next(1);
                source2$.next(2);
                source3$.next(3);
            });
        });

        describe('printEmissionSummary', () => {
            it('should handle no timing data', () => {
                observableProfiler.printEmissionSummary('NoComponent', 'noId');
                expect(mockLogInfo).toHaveBeenCalledWith(
                    '[ObservableProfiler] No timing data for NoComponent:noId',
                );
            });

            it('should print emission summary sorted by count', (done) => {
                mockPerformance.now.
                    mockReturnValueOnce(0). // subscribe obs1
                    mockReturnValueOnce(0). // subscribe obs2
                    mockReturnValueOnce(10). // emit obs1 #1
                    mockReturnValueOnce(15). // emit obs1 #2
                    mockReturnValueOnce(20); // emit obs2 #1

                const source1$ = new Subject<number>();
                const source2$ = new Subject<number>();

                const wrapped1$ = observableProfiler.profile(source1$, 'frequentObs', 'Summary', 's1');
                const wrapped2$ = observableProfiler.profile(source2$, 'rareObs', 'Summary', 's1');

                let emitCount = 0;
                const checkDone = () => {
                    emitCount++;
                    if (emitCount === 3) {
                        observableProfiler.printEmissionSummary('Summary', 's1');

                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('OBSERVABLE EMISSION COUNTS'));
                        expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('TOTAL EMISSIONS: 3'));
                        done();
                    }
                };

                const sub1 = wrapped1$.subscribe({next: checkDone});
                const sub2 = wrapped2$.subscribe({next: checkDone});

                source1$.next(1);
                source1$.next(2);
                source2$.next(1);

                sub1.unsubscribe();
                sub2.unsubscribe();
            });
        });

        describe('clear', () => {
            it('should clear all timing data', (done) => {
                const source$ = new Subject<number>();
                const wrapped$ = observableProfiler.profile(source$, 'obs', 'Clear', 'c1');

                wrapped$.subscribe({
                    next: () => {
                        expect(observableProfiler.getTimings('Clear', 'c1')).toBeDefined();
                        observableProfiler.clear();
                        expect(observableProfiler.getTimings('Clear', 'c1')).toBeUndefined();
                        done();
                    },
                });

                source$.next(1);
            });
        });

        describe('setEnabled', () => {
            it('should disable profiling when set to false', (done) => {
                const source$ = new Subject<number>();
                observableProfiler.setEnabled(false);

                const wrapped$ = observableProfiler.profile(source$, 'obs', 'Disabled', 'd1');
                expect(wrapped$).toBe(source$);

                wrapped$.subscribe({
                    next: () => {
                        expect(observableProfiler.getTimings('Disabled', 'd1')).toBeUndefined();
                        done();
                    },
                });

                source$.next(1);
            });

            it('should enable profiling when set to true', (done) => {
                observableProfiler.setEnabled(true);

                const source$ = new Subject<number>();
                const wrapped$ = observableProfiler.profile(source$, 'obs', 'Enabled', 'e1');

                wrapped$.subscribe({
                    next: () => {
                        expect(observableProfiler.getTimings('Enabled', 'e1')).toBeDefined();
                        done();
                    },
                });

                source$.next(1);
            });
        });

        describe('profileIfEnabled', () => {
            it('should profile when enabled', (done) => {
                observableProfiler.setEnabled(true);

                const source$ = new Subject<number>();
                const wrapped$ = observableProfiler.profileIfEnabled(source$, 'obs', 'Test', 't1');

                wrapped$.subscribe({
                    next: () => {
                        expect(observableProfiler.getTimings('Test', 't1')).toBeDefined();
                        done();
                    },
                });

                source$.next(1);
            });

            it('should not profile when disabled', (done) => {
                observableProfiler.setEnabled(false);

                const source$ = new Subject<number>();
                const wrapped$ = observableProfiler.profileIfEnabled(source$, 'obs', 'Test', 't2');

                expect(wrapped$).toBe(source$);
                wrapped$.subscribe({
                    next: () => {
                        expect(observableProfiler.getTimings('Test', 't2')).toBeUndefined();
                        done();
                    },
                });

                source$.next(1);
            });
        });
    });
});
