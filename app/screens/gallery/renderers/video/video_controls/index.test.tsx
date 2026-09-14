// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {LightboxWrapper, sharedNumber} from '@test/gallery_test_helpers';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import VideoControls from './index';

const SHOW_CONTROLS_TIMEOUT = 4000;
const INTERACTION_WINDOW = 300;

const defaultProps = () => ({
    visible: true,
    paused: false,
    currentTime: sharedNumber(10),
    duration: 60,
    speed: 1,
    isFullscreen: false,
    seekSeconds: 10 as const,
    onPlay: jest.fn(),
    onPause: jest.fn(),
    onSeek: jest.fn(),
    onRewind: jest.fn(),
    onForward: jest.fn(),
    onSpeedChange: jest.fn(),
    onFullscreen: jest.fn(),
    onCaptionsToggle: jest.fn(),
    setShowCustomControls: jest.fn(),
});

const renderControls = (overrides: Partial<ReturnType<typeof defaultProps>> = {}) => {
    const props = {...defaultProps(), ...overrides};

    const utils = renderWithIntlAndTheme(
        <LightboxWrapper>
            <VideoControls {...props}/>
        </LightboxWrapper>,
    );

    return {...utils, props};
};

describe('VideoControls', () => {
    beforeEach(() => {
        enableFakeTimers();
    });

    afterEach(() => {
        disableFakeTimers();
    });

    describe('auto-hide', () => {
        it('should hide the controls after the timeout when a non-persistent control is used', async () => {
            const {props} = renderControls();

            fireEvent.press(screen.getByTestId('gallery.video.fullscreen.button'));
            expect(props.setShowCustomControls).not.toHaveBeenCalled();

            await act(async () => {
                await advanceTimers(SHOW_CONTROLS_TIMEOUT);
            });

            expect(props.setShowCustomControls).toHaveBeenCalledWith(false);
        });

        it('should keep the controls visible after pausing', async () => {
            const {props} = renderControls();

            fireEvent.press(screen.getByTestId('gallery.video.pause.button'));

            await act(async () => {
                await advanceTimers(SHOW_CONTROLS_TIMEOUT);
            });

            expect(props.onPause).toHaveBeenCalled();
            expect(props.setShowCustomControls).not.toHaveBeenCalled();
        });

        it('should not schedule a hide while the video is paused', async () => {
            const {props} = renderControls({paused: true});

            fireEvent.press(screen.getByTestId('gallery.video.fullscreen.button'));

            await act(async () => {
                await advanceTimers(SHOW_CONTROLS_TIMEOUT);
            });

            expect(props.onFullscreen).toHaveBeenCalled();
            expect(props.setShowCustomControls).not.toHaveBeenCalled();
        });

        it('should schedule a hide when playback is resumed from a paused state', async () => {
            const {props} = renderControls({paused: true});

            fireEvent.press(screen.getByTestId('gallery.video.play.button'));

            await act(async () => {
                await advanceTimers(SHOW_CONTROLS_TIMEOUT);
            });

            expect(props.onPlay).toHaveBeenCalled();
            expect(props.setShowCustomControls).toHaveBeenCalledWith(false);
        });

        // Opening the speed menu must not arm the auto-hide. The menu itself cannot be
        // rendered here (it returns null until onLayout measures it, which jsdom never
        // fires), so this asserts the timer via setShowCustomControls alone.
        it('should not schedule a hide while the speed menu is open', async () => {
            const {props} = renderControls();

            fireEvent.press(screen.getByTestId('gallery.video.speed.button'));

            await act(async () => {
                await advanceTimers(SHOW_CONTROLS_TIMEOUT);
            });

            expect(props.setShowCustomControls).not.toHaveBeenCalled();
        });
    });

    describe('background press', () => {
        it('should hide the controls when they are visible', () => {
            const {props} = renderControls({visible: true});

            fireEvent(screen.getByTestId('gallery.video.controls'), 'touchEnd');

            expect(props.setShowCustomControls).toHaveBeenCalledWith(false);
        });

        it('should show the controls when they are hidden', () => {
            const {props} = renderControls({visible: false});

            fireEvent(screen.getByTestId('gallery.video.controls'), 'touchEnd');

            expect(props.setShowCustomControls).toHaveBeenCalledWith(true);
        });

        it('should ignore a background press that immediately follows a control press', async () => {
            const {props} = renderControls();

            fireEvent.press(screen.getByTestId('gallery.video.fullscreen.button'));
            fireEvent(screen.getByTestId('gallery.video.controls'), 'touchEnd');

            expect(props.setShowCustomControls).not.toHaveBeenCalled();

            await act(async () => {
                await advanceTimers(INTERACTION_WINDOW);
            });
            fireEvent(screen.getByTestId('gallery.video.controls'), 'touchEnd');

            expect(props.setShowCustomControls).toHaveBeenCalledWith(false);
        });
    });

    describe('when not visible', () => {
        it('should not invoke control callbacks', () => {
            const {props} = renderControls({visible: false});

            fireEvent.press(screen.getByTestId('gallery.video.pause.button'));
            fireEvent.press(screen.getByTestId('gallery.video.forward.button'));

            expect(props.onPause).not.toHaveBeenCalled();
            expect(props.onForward).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should not hide the controls after unmounting with a pending timer', async () => {
            const {props, unmount} = renderControls();

            fireEvent.press(screen.getByTestId('gallery.video.fullscreen.button'));
            unmount();

            await act(async () => {
                await advanceTimers(SHOW_CONTROLS_TIMEOUT);
            });

            expect(props.setShowCustomControls).not.toHaveBeenCalled();
        });
    });
});
