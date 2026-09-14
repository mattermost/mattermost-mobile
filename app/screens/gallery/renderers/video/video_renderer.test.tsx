// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import * as Worklets from 'react-native-worklets';

import {buildGalleryItem, buildLightboxValues, captionPostProps, LightboxWrapper, sharedBoolean} from '@test/gallery_test_helpers';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import VideoRenderer from './video_renderer';

import type {GalleryItemType} from '@typings/screens/gallery';

jest.mock('@actions/local/file', () => ({
    updateLocalFilePath: jest.fn(),
}));

const PROGRESS_DEBOUNCE = 100;
const PLAYBACK_STATE_DEBOUNCE = 200;

type RenderOptions = {
    index?: number;
    initialIndex?: number;
    isPageActive?: ReturnType<typeof sharedBoolean>;
    item?: GalleryItemType;
};

const hideHeaderAndFooter = jest.fn();

const renderVideo = ({index = 0, initialIndex = 0, isPageActive = sharedBoolean(true), item = buildGalleryItem()}: RenderOptions = {}) => {
    const lightbox = buildLightboxValues();

    const utils = renderWithIntlAndTheme(
        <LightboxWrapper sharedValues={lightbox}>
            <VideoRenderer
                canDownloadFiles={true}
                enableSecureFilePreview={false}
                height={720}
                width={1280}
                index={index}
                initialIndex={initialIndex}
                item={item}
                isPageActive={isPageActive}
                hideHeaderAndFooter={hideHeaderAndFooter}

                // Unused by the renderer but required by GalleryPagerItem.
                onPageStateChange={jest.fn()}
                isPagerInProgress={sharedBoolean(false) as never}
                pagerPanGesture={{} as never}
                pagerTapGesture={{} as never}
                lightboxPanGesture={{} as never}
            />
        </LightboxWrapper>,
    );

    return {...utils, lightbox};
};

const player = () => screen.getByTestId('gallery.video.player');

const seekMock = () => {
    // The mocked Video exposes a stable per-instance ref handle; the renderer holds the
    // same object, so its seek calls are observable here.
    const instance = player();
    return instance.props.__seekSpy;
};

const load = async (duration: number) => {
    await act(async () => {
        player().props.onLoad({duration});
    });
};

const readyForDisplay = async () => {
    await act(async () => {
        player().props.onReadyForDisplay();
    });
};

const progress = async (currentTime: number) => {
    await act(async () => {
        player().props.onProgress({currentTime});
    });
    await act(async () => {
        await advanceTimers(PROGRESS_DEBOUNCE);
    });
};

describe('VideoRenderer', () => {
    // The worklets mock makes scheduleOnUI a no-op, so useStateFromSharedValue never reads
    // isPageActive and the renderer stays stuck in its inactive-page (paused) state.
    // Patched here rather than in setup.ts: a global synchronous scheduleOnUI also makes
    // withTiming start immediately, breaking toHaveAnimatedStyle assertions elsewhere.
    beforeAll(() => {
        jest.spyOn(Worklets, 'scheduleOnUI').mockImplementation((fn: () => void) => fn());
    });

    beforeEach(() => {
        enableFakeTimers();
        hideHeaderAndFooter.mockClear();
    });

    afterEach(() => {
        disableFakeTimers();
    });

    describe('seek step derived from duration', () => {
        it('should not render seek controls for a video shorter than 10 seconds', async () => {
            renderVideo();
            await readyForDisplay();
            await load(5);

            expect(screen.queryByTestId('gallery.video.rewind.button')).toBeNull();
            expect(screen.queryByTestId('gallery.video.forward.button')).toBeNull();
        });

        it('should render seek controls for a video between 10 seconds and 15 minutes', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);

            expect(screen.getByTestId('gallery.video.rewind.button')).toBeVisible();
            expect(screen.getByTestId('gallery.video.forward.button')).toBeVisible();
        });

        it('should render seek controls for a video longer than 15 minutes', async () => {
            renderVideo();
            await readyForDisplay();
            await load(1200);

            expect(screen.getByTestId('gallery.video.rewind.button')).toBeVisible();
            expect(screen.getByTestId('gallery.video.forward.button')).toBeVisible();
        });
    });

    describe('seeking', () => {
        it('should clamp rewind at the start of the video', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);
            await progress(3);

            fireEvent.press(screen.getByTestId('gallery.video.rewind.button'));

            expect(seekMock()).toHaveBeenCalledWith(0);
        });

        it('should clamp fast forward at the end of the video', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);
            await progress(55);

            fireEvent.press(screen.getByTestId('gallery.video.forward.button'));

            expect(seekMock()).toHaveBeenCalledWith(60);
        });

        it('should rewind by the seek step when away from the boundaries', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);
            await progress(30);

            fireEvent.press(screen.getByTestId('gallery.video.rewind.button'));

            expect(seekMock()).toHaveBeenCalledWith(20);
        });

        it('should fast forward by the seek step when away from the boundaries', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);
            await progress(30);

            fireEvent.press(screen.getByTestId('gallery.video.forward.button'));

            expect(seekMock()).toHaveBeenCalledWith(40);
        });
    });

    describe('play and pause', () => {
        it('should restart from the beginning when playing a video that reached the end', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);
            await progress(60);

            await act(async () => {
                player().props.onEnd();
            });

            fireEvent.press(screen.getByTestId('gallery.video.play.button'));

            expect(seekMock()).toHaveBeenCalledWith(0);
        });

        it('should not seek when resuming a video from the middle', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);
            await progress(30);

            fireEvent.press(screen.getByTestId('gallery.video.pause.button'));
            seekMock().mockClear();
            fireEvent.press(screen.getByTestId('gallery.video.play.button'));

            expect(seekMock()).not.toHaveBeenCalled();
        });

        it('should restore the header and show controls when playback ends', async () => {
            renderVideo();
            await readyForDisplay();
            await load(60);

            await act(async () => {
                player().props.onEnd();
            });

            expect(hideHeaderAndFooter).toHaveBeenCalledWith(false);
            expect(screen.getByTestId('gallery.video.play.button')).toBeVisible();
        });
    });

    describe('initial playback', () => {
        it('should start playing when the video is the initially selected page', async () => {
            renderVideo({index: 0, initialIndex: 0});
            await readyForDisplay();

            expect(screen.getByTestId('gallery.video.pause.button')).toBeVisible();
        });

        it('should stay paused and seek to a poster frame when the video is not the initial page', async () => {
            renderVideo({index: 2, initialIndex: 0});
            await readyForDisplay();

            expect(screen.getByTestId('gallery.video.play.button')).toBeVisible();
            expect(seekMock()).toHaveBeenCalledWith(0.4);
        });
    });

    describe('playback state changes', () => {
        it('should ignore playback state changes while the page is not active', async () => {
            renderVideo({isPageActive: sharedBoolean(false), index: 1, initialIndex: 1});
            await readyForDisplay();
            await load(60);

            await act(async () => {
                player().props.onPlaybackStateChanged({isPlaying: true});
            });
            await act(async () => {
                await advanceTimers(PLAYBACK_STATE_DEBOUNCE);
            });

            expect(screen.getByTestId('gallery.video.play.button')).toBeVisible();
        });
    });

    describe('progress', () => {
        it('should debounce progress updates and render only the latest time', async () => {
            renderVideo();
            await readyForDisplay();
            await load(600);

            await act(async () => {
                player().props.onProgress({currentTime: 10});
                player().props.onProgress({currentTime: 20});
                player().props.onProgress({currentTime: 30});
            });
            await act(async () => {
                await advanceTimers(PROGRESS_DEBOUNCE);
            });

            expect(screen.getByTestId('gallery.video.current_time')).toHaveTextContent('0:30');
        });
    });

    describe('errors', () => {
        it('should replace the player with the error view when playback fails', async () => {
            renderVideo();

            await act(async () => {
                player().props.onError();
            });

            expect(screen.getByTestId('gallery.video.error')).toBeVisible();
            expect(screen.queryByTestId('gallery.video.player')).toBeNull();
        });

    });

    describe('captions', () => {
        it('should not render the captions control when the post has no captions', async () => {
            renderVideo();
            await readyForDisplay();

            expect(screen.queryByTestId('gallery.video.captions.button')).toBeNull();
        });

        it('should render the captions control when the post has captions', async () => {
            renderVideo({item: buildGalleryItem({postProps: captionPostProps()})});
            await readyForDisplay();

            expect(screen.getByTestId('gallery.video.captions.button')).toBeVisible();
        });

        it('should disable the selected text track when captions are toggled off', async () => {
            renderVideo({item: buildGalleryItem({postProps: captionPostProps()})});
            await readyForDisplay();

            expect(player().props.selectedTextTrack).toEqual({type: 'index', value: 0});

            fireEvent.press(screen.getByTestId('gallery.video.captions.button'));

            expect(player().props.selectedTextTrack).toEqual({type: 'disabled', value: ''});
        });
    });

    describe('cleanup', () => {
        it('should not update state after unmounting with pending debounced work', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const {unmount} = renderVideo();
            await readyForDisplay();
            await load(60);

            await act(async () => {
                player().props.onProgress({currentTime: 12});
                player().props.onPlaybackStateChanged({isPlaying: false});
            });

            unmount();

            await act(async () => {
                await advanceTimers(PROGRESS_DEBOUNCE + PLAYBACK_STATE_DEBOUNCE);
            });

            expect(errorSpy).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });
});
