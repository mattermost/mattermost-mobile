// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {act, renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import GalleryScreen from './index';

jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

const mockGalleryClose = jest.fn();
const mockGalleryRender = jest.fn();
jest.mock('./gallery', () => {
    const {forwardRef, useImperativeHandle} = jest.requireActual<typeof import('react')>('react');
    return {
        __esModule: true,
        default: forwardRef((props: {onHide: () => void}, ref) => {
            mockGalleryRender(props);
            useImperativeHandle(ref, () => ({close: mockGalleryClose}));
            return null;
        }),
    };
});
jest.mock('./header', () => () => null);
jest.mock('./footer', () => () => null);

describe('GalleryScreen', () => {
    beforeEach(() => {
        enableFakeTimers();
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('should close through the gallery animation when the Android back button is pressed', async () => {
        renderWithIntlAndTheme(
            <GalleryScreen
                galleryIdentifier='gallery-id'
                hideActions={false}
                initialIndex={0}
                items={[]}
            />,
        );

        const backHandlerCall = jest.mocked(useAndroidHardwareBackHandler).mock.calls.at(-1);
        if (!backHandlerCall) {
            throw new Error('useAndroidHardwareBackHandler was not called');
        }
        const [screen, onBackPress] = backHandlerCall;
        expect(screen).toBe(Screens.GALLERY);

        act(() => {
            onBackPress();
        });
        await act(async () => {
            await advanceTimers(16);
        });

        // Back starts the close animation instead of leaving the screen right away
        expect(mockGalleryClose).toHaveBeenCalledTimes(1);
        expect(navigateBack).not.toHaveBeenCalled();

        // The gallery calls onHide once the close animation has finished
        const onHide = mockGalleryRender.mock.calls.at(-1)?.[0]?.onHide;
        expect(onHide).toBeInstanceOf(Function);
        act(() => {
            onHide();
        });
        await act(async () => {
            await advanceTimers(16);
        });

        expect(navigateBack).toHaveBeenCalledTimes(1);
    });
});
