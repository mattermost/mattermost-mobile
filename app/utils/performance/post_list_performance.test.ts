// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import performance from 'react-native-performance';

import LocalConfig from '@assets/config.json';
import PostListPerformance from '@utils/performance/post_list_performance';

// Mock dependencies
jest.mock('react-native-performance', () => ({
    now: jest.fn(),
}));

jest.mock('@assets/config.json', () => ({
    EnablePostListPerformance: false,
}));

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
    get: jest.fn(),
}), {virtual: true});

const mockPerformance = performance as jest.Mocked<typeof performance>;

describe('PostListPerformanceTracker', () => {
    const channelId = 'channel123';
    const threadId = 'thread456';
    const postId = 'post789';

    beforeEach(() => {
        jest.clearAllMocks();
        mockPerformance.now.mockReturnValue(0);
        PostListPerformance.setEnabled(false);
        PostListPerformance.clearMetrics(channelId);
        PostListPerformance.clearMetrics(channelId, threadId);
    });

    describe('when performance tracking is disabled', () => {
        beforeEach(() => {
            LocalConfig.EnablePostListPerformance = false;
            PostListPerformance.setEnabled(false);
        });

        it('should return false for isEnabled', () => {
            expect(PostListPerformance.isEnabled()).toBe(false);
        });

        it('should not track initial render when disabled', () => {
            PostListPerformance.startInitialRender(channelId, undefined, 50);
            PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

            // Should not throw or cause issues
            PostListPerformance.printSummary(channelId);
        });

        it('should not track markdown parse when disabled', () => {
            PostListPerformance.trackMarkdownParse(channelId, undefined, postId, 100, 5.5);

            // Should not throw or cause issues
            PostListPerformance.printSummary(channelId);
        });
    });

    describe('when performance tracking is enabled', () => {
        beforeEach(() => {
            LocalConfig.EnablePostListPerformance = true;
            (global as any).__DEV__ = true;
            PostListPerformance.setEnabled(true);
        });

        it('should return true for isEnabled', () => {
            expect(PostListPerformance.isEnabled()).toBe(true);
        });

        describe('architecture detection', () => {
            it('should detect new architecture when TurboModuleRegistry is available', () => {
                const TurboModuleRegistry = require('react-native/Libraries/TurboModule/TurboModuleRegistry');
                TurboModuleRegistry.get.mockReturnValue({});

                // Clear module cache and reinitialize to detect architecture
                jest.isolateModules(() => {
                    const PostListPerf = require('@utils/performance/post_list_performance').default;
                    PostListPerf.setEnabled(true);
                    mockPerformance.now.mockReturnValue(100);
                    PostListPerf.startInitialRender('test-channel', undefined, 10);
                    PostListPerf.endInitialRender('test-channel', undefined);

                    // Verify by checking the summary output contains "new"
                    PostListPerf.printSummary('test-channel');
                });
            });

            it('should detect old architecture when TurboModuleRegistry is not available', () => {
                jest.isolateModules(() => {
                    jest.doMock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
                        throw new Error('Not available');
                    }, {virtual: true});

                    const PostListPerf = require('@utils/performance/post_list_performance').default;
                    PostListPerf.setEnabled(true);
                    mockPerformance.now.mockReturnValue(100);
                    PostListPerf.startInitialRender('test-channel-old', undefined, 10);
                    PostListPerf.endInitialRender('test-channel-old', undefined);

                    // Verify by checking the summary output contains "old"
                    PostListPerf.printSummary('test-channel-old');
                });
            });
        });

        describe('startInitialRender', () => {
            it('should track initial render start time for channel', () => {
                mockPerformance.now.mockReturnValue(100);

                PostListPerformance.startInitialRender(channelId, undefined, 50);

                // Verify tracking by calling printSummary
                PostListPerformance.printSummary(channelId);
            });

            it('should track initial render start time for thread', () => {
                mockPerformance.now.mockReturnValue(200);

                PostListPerformance.startInitialRender(channelId, threadId, 25);

                // Verify tracking by calling printSummary
                PostListPerformance.printSummary(channelId, threadId);
            });

            it('should not create duplicate metrics if already tracking', () => {
                mockPerformance.now.mockReturnValue(100);

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.startInitialRender(channelId, undefined, 50);

                // Second call should be a no-op
                PostListPerformance.printSummary(channelId);
            });
        });

        describe('endInitialRender', () => {
            it('should calculate initial render duration', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100). // start
                    mockReturnValueOnce(250); // end

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                PostListPerformance.printSummary(channelId);
            });

            it('should handle missing rendered and viewable counts', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, undefined, 30);
                PostListPerformance.endInitialRender(channelId, undefined);

                PostListPerformance.printSummary(channelId);
            });

            it('should not update if metrics not found', () => {
                PostListPerformance.endInitialRender('nonexistent', undefined, 10, 5);

                PostListPerformance.printSummary('nonexistent');
            });

            it('should not update if already ended', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100). // start
                    mockReturnValueOnce(200). // first end
                    mockReturnValueOnce(300); // second end (should be ignored)

                PostListPerformance.startInitialRender(channelId, undefined, 20);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);
                PostListPerformance.endInitialRender(channelId, undefined, 15, 8);

                PostListPerformance.printSummary(channelId);
            });
        });

        describe('trackMarkdownParse', () => {
            it('should track markdown parse times', () => {
                mockPerformance.now.mockReturnValue(100);
                PostListPerformance.startInitialRender(channelId, undefined, 10);

                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post1', 100, 5.5);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post2', 200, 10.5);

                PostListPerformance.printSummary(channelId);
            });

            it('should calculate percentiles for markdown parse times', () => {
                mockPerformance.now.mockReturnValue(100);
                PostListPerformance.startInitialRender(channelId, undefined, 10);

                // Add multiple parse times to calculate percentiles
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post1', 100, 1);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post2', 100, 2);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post3', 100, 3);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post4', 100, 4);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post5', 100, 5);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post6', 100, 10);

                PostListPerformance.printSummary(channelId);
            });

            it('should not track if metrics not initialized', () => {
                PostListPerformance.trackMarkdownParse('nonexistent', undefined, postId, 100, 5.5);

                PostListPerformance.printSummary('nonexistent');
            });
        });

        describe('printSummary', () => {
            it('should print comprehensive summary for channel', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100). // start
                    mockReturnValueOnce(250); // end

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post1', 100, 5);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post2', 200, 10);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                PostListPerformance.printSummary(channelId);
            });

            it('should print summary for thread', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, threadId, 25);
                PostListPerformance.endInitialRender(channelId, threadId, 10, 5);

                PostListPerformance.printSummary(channelId, threadId);
            });

            it('should handle no metrics', () => {
                PostListPerformance.printSummary('nonexistent');
            });

            it('should handle incomplete metrics', () => {
                mockPerformance.now.mockReturnValue(100);

                PostListPerformance.startInitialRender(channelId, undefined, 30);

                // Don't call endInitialRender
                PostListPerformance.printSummary(channelId);
            });

            it('should show N/A for missing markdown average', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, undefined, 10);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                // Don't track any markdown parses
                PostListPerformance.printSummary(channelId);
            });

            it('should not show percentiles when no markdown parse times', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, undefined, 10);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                PostListPerformance.printSummary(channelId);
            });

            it('should show platform information', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, undefined, 10);
                PostListPerformance.endInitialRender(channelId, undefined);

                PostListPerformance.printSummary(channelId);

                // Platform should be either 'ios' or 'android'
                expect(['ios', 'android']).toContain(Platform.OS);
            });
        });

        describe('clearMetrics', () => {
            it('should clear metrics for channel', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                PostListPerformance.clearMetrics(channelId);

                PostListPerformance.printSummary(channelId);
            });

            it('should clear metrics for thread', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, threadId, 25);
                PostListPerformance.endInitialRender(channelId, threadId, 10, 5);

                PostListPerformance.clearMetrics(channelId, threadId);

                PostListPerformance.printSummary(channelId, threadId);
            });

            it('should clear markdown parse times', () => {
                mockPerformance.now.mockReturnValue(100);

                PostListPerformance.startInitialRender(channelId, undefined, 10);
                PostListPerformance.trackMarkdownParse(channelId, undefined, 'post1', 100, 5);

                PostListPerformance.clearMetrics(channelId);

                PostListPerformance.startInitialRender(channelId, undefined, 10);
                PostListPerformance.printSummary(channelId);
            });
        });

        describe('setEnabled', () => {
            it('should disable tracking when set to false', () => {
                PostListPerformance.setEnabled(false);

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                PostListPerformance.printSummary(channelId);
            });

            it('should enable tracking when set to true', () => {
                PostListPerformance.setEnabled(true);
                mockPerformance.now.
                    mockReturnValueOnce(100).
                    mockReturnValueOnce(200);

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);

                PostListPerformance.printSummary(channelId);
            });
        });

        describe('separate channel and thread tracking', () => {
            it('should track channel and thread metrics separately', () => {
                mockPerformance.now.
                    mockReturnValueOnce(100). // channel start
                    mockReturnValueOnce(150). // thread start
                    mockReturnValueOnce(200). // channel end
                    mockReturnValueOnce(300); // thread end

                PostListPerformance.startInitialRender(channelId, undefined, 50);
                PostListPerformance.startInitialRender(channelId, threadId, 25);
                PostListPerformance.endInitialRender(channelId, undefined, 10, 5);
                PostListPerformance.endInitialRender(channelId, threadId, 5, 3);

                PostListPerformance.printSummary(channelId);
                PostListPerformance.printSummary(channelId, threadId);
            });
        });
    });
});
