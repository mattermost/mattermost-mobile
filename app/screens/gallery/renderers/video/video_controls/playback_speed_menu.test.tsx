// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Platform, View} from 'react-native';

import useDidMount from '@hooks/did_mount';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {ViewPositionProvider, useViewPosition} from './context';
import PlaybackSpeedMenu from './playback_speed_menu';

jest.mock('@utils/gallery', () => ({
    ...jest.requireActual('@utils/gallery'),
    measureViewInWindow: jest.fn(() => Promise.resolve({x: 100, y: 40, width: 44, height: 44})),
}));

// The menu only renders once the speed button has been measured, which TopControls
// normally does on mount.
const SeedViewPosition = () => {
    const {setViewPosition} = useViewPosition();

    useDidMount(() => {
        setViewPosition({ref: React.createRef<View>(), x: 100, y: 40, width: 44, height: 44});
    });

    return null;
};

const renderMenu = (overrides: Partial<React.ComponentProps<typeof PlaybackSpeedMenu>> = {}) => {
    const props: React.ComponentProps<typeof PlaybackSpeedMenu> = {
        currentSpeed: 1,
        handleControlAction: jest.fn((_control, action?: () => void) => action?.()),
        isFullscreen: false,
        onSpeedChange: jest.fn(),
        setShowSpeedMenu: jest.fn(),
        visible: true,
        ...overrides,
    };

    const utils = renderWithIntlAndTheme(
        <ViewPositionProvider>
            <SeedViewPosition/>
            <PlaybackSpeedMenu {...props}/>
        </ViewPositionProvider>,
    );

    return {...utils, props};
};

describe('PlaybackSpeedMenu', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
        Platform.OS = originalOS;
    });

    it('should not render when it is not visible', () => {
        renderMenu({visible: false});

        expect(screen.queryByTestId('gallery.video.speed_menu')).toBeNull();
    });

    it('should not render before the speed button has been measured', () => {
        const props = {
            currentSpeed: 1,
            handleControlAction: jest.fn(),
            isFullscreen: false,
            onSpeedChange: jest.fn(),
            setShowSpeedMenu: jest.fn(),
            visible: true,
        };

        renderWithIntlAndTheme(
            <ViewPositionProvider>
                <PlaybackSpeedMenu {...props}/>
            </ViewPositionProvider>,
        );

        expect(screen.queryByTestId('gallery.video.speed_menu')).toBeNull();
    });

    it('should render every speed option when visible', () => {
        renderMenu();

        expect(screen.getByTestId('gallery.video.speed_menu')).toBeVisible();
        for (const rate of [0.5, 1, 1.5, 2]) {
            expect(screen.getByTestId(`gallery.video.speed_option.${rate}`)).toBeVisible();
        }
    });

    it('should apply the selected speed and close the menu', () => {
        const {props} = renderMenu();

        fireEvent.press(screen.getByTestId('gallery.video.speed_option.2'));

        expect(props.onSpeedChange).toHaveBeenCalledWith(2);
        expect(props.setShowSpeedMenu).toHaveBeenCalledWith(false);
    });

    it('should mark the current speed as selected', () => {
        Platform.OS = 'ios';
        renderMenu({currentSpeed: 1.5});

        expect(screen.getByTestId('gallery.video.speed_option.1.5')).toHaveTextContent(/✓/);
        expect(screen.getByTestId('gallery.video.speed_option.2')).not.toHaveTextContent(/✓/);
    });

    it('should close the menu from the done button on iOS', () => {
        Platform.OS = 'ios';
        const {props} = renderMenu();

        fireEvent.press(screen.getByTestId('gallery.video.speed_menu.done.button'));

        expect(props.handleControlAction).toHaveBeenCalledWith('closeSpeedMenu', expect.any(Function));
        expect(props.setShowSpeedMenu).toHaveBeenCalledWith(false);
    });

    it('should not render the done button on Android', () => {
        Platform.OS = 'android';
        renderMenu();

        expect(screen.queryByTestId('gallery.video.speed_menu.done.button')).toBeNull();
    });

    it('should label the default speed as normal on iOS', () => {
        Platform.OS = 'ios';
        renderMenu();

        expect(screen.getByTestId('gallery.video.speed_option.1')).toHaveTextContent(/Normal/);
    });
});
