// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, render} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';

import GalleryScreen from './index';

const mockCloseGallery = jest.fn();
const mockHideHeaderAndFooter = jest.fn();

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useWindowDimensions: jest.fn(() => ({height: 800, width: 400})),
}));

jest.mock('@hooks/gallery', () => ({
    useGalleryControls: jest.fn(() => ({
        footerStyles: {},
        headerAndFooterHidden: {value: false},
        headerStyles: {},
        hideHeaderAndFooter: mockHideHeaderAndFooter,
    })),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({bottom: 0})),
}));

jest.mock('./footer', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

jest.mock('./gallery', () => {
    const ReactModule = require('react');
    const MockGallery = ReactModule.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
        ReactModule.useImperativeHandle(ref, () => ({close: mockCloseGallery}));
        return null;
    });
    MockGallery.displayName = 'MockGallery';

    return {
        __esModule: true,
        default: MockGallery,
    };
});

jest.mock('./header', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

describe('GalleryScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
            callback(0);
            return 0;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should animate the gallery closed before navigating back on Android hardware back', () => {
        render(
            <GalleryScreen
                galleryIdentifier='post-1'
                hideActions={false}
                initialIndex={0}
                items={[]}
            />,
        );

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(Screens.GALLERY, expect.any(Function));

        const backHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        act(() => {
            backHandler();
        });

        expect(mockHideHeaderAndFooter).toHaveBeenCalledTimes(1);
        expect(mockCloseGallery).toHaveBeenCalledTimes(1);
        expect(navigateBack).not.toHaveBeenCalled();
    });
});
