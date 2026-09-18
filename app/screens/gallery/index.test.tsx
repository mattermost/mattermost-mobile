// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {act, renderWithIntlAndTheme} from '@test/intl-test-helper';

import GalleryScreen from './index';

jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

const mockGalleryClose = jest.fn();
jest.mock('./gallery', () => {
    const {forwardRef, useImperativeHandle} = jest.requireActual<typeof import('react')>('react');
    return {
        __esModule: true,
        default: forwardRef((_props, ref) => {
            useImperativeHandle(ref, () => ({close: mockGalleryClose}));
            return null;
        }),
    };
});
jest.mock('./header', () => () => null);
jest.mock('./footer', () => () => null);

describe('GalleryScreen', () => {
    beforeEach(() => {
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
            callback(0);
            return 0;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should close through the gallery animation when the Android back button is pressed', () => {
        renderWithIntlAndTheme(
            <GalleryScreen
                galleryIdentifier='gallery-id'
                hideActions={false}
                initialIndex={0}
                items={[]}
            />,
        );

        const [screen, onBackPress] = jest.mocked(useAndroidHardwareBackHandler).mock.calls.at(-1)!;
        expect(screen).toBe(Screens.GALLERY);

        act(() => {
            onBackPress();
        });

        // The animation restores the thumbnail and navigates back once it finishes
        expect(mockGalleryClose).toHaveBeenCalledTimes(1);
        expect(navigateBack).not.toHaveBeenCalled();
    });
});
