// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';
import {Platform} from 'react-native';
import * as Worklets from 'react-native-worklets';

import {LightboxWrapper, sharedNumber} from '@test/gallery_test_helpers';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import BottomControls from './bottom_controls';
import ProgressBar from './progress_bar';

const renderBottomControls = (overrides: Partial<React.ComponentProps<typeof BottomControls>> = {}) => {
    const props: React.ComponentProps<typeof BottomControls> = {
        currentTime: sharedNumber(0),
        duration: 60,
        handleControlAction: jest.fn((_control, action?: () => void) => action?.()),
        onSeek: jest.fn(),
        paddingBottom: 0,
        ...overrides,
    };

    const utils = renderWithIntlAndTheme(
        <LightboxWrapper>
            <BottomControls {...props}/>
        </LightboxWrapper>,
    );

    return {...utils, props};
};

describe('BottomControls', () => {
    const originalOS = Platform.OS;

    // The worklets mock makes scheduleOnUI a no-op, so useStateFromSharedValue never reads
    // currentTime on mount and every elapsed time would render as zero.
    beforeAll(() => {
        jest.spyOn(Worklets, 'scheduleOnUI').mockImplementation((fn: () => void) => fn());
    });

    afterEach(() => {
        Platform.OS = originalOS;
    });

    it('should render the elapsed time', () => {
        renderBottomControls({currentTime: sharedNumber(75)});

        expect(screen.getByTestId('gallery.video.current_time')).toHaveTextContent('1:15');
    });

    it('should render the remaining time on iOS', () => {
        Platform.OS = 'ios';
        renderBottomControls({currentTime: sharedNumber(20), duration: 60});

        expect(screen.getByTestId('gallery.video.duration')).toHaveTextContent('-0:40');
    });

    it('should render the total duration on Android', () => {
        Platform.OS = 'android';
        renderBottomControls({currentTime: sharedNumber(20), duration: 60});

        expect(screen.getByTestId('gallery.video.duration')).toHaveTextContent('1:00');
    });

    it('should render a zero duration without dividing by zero', () => {
        Platform.OS = 'android';
        renderBottomControls({currentTime: sharedNumber(0), duration: 0});

        expect(screen.getByTestId('gallery.video.current_time')).toHaveTextContent('0:00');
        expect(screen.getByTestId('gallery.video.duration')).toHaveTextContent('0:00');
    });

    it('should tag seeks as a seek control action so the controls stay on screen', () => {
        const handleControlAction = jest.fn((_control: string, action?: () => void) => action?.());
        const onSeek = jest.fn();
        renderBottomControls({handleControlAction, onSeek});

        // ProgressBar drives seeking from a gesture worklet, which does not run under Jest;
        // invoke the callback it was handed to assert the wiring around it.
        // eslint-disable-next-line new-cap
        screen.UNSAFE_getByType(ProgressBar).props.onSeek(42);

        expect(handleControlAction).toHaveBeenCalledWith('seek', expect.any(Function));
        expect(onSeek).toHaveBeenCalledWith(42);
    });
});
