// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';

import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateToHomeTab} from '@screens/navigation';

import useAndroidHomeTabBackHandler from './android_home_tab_back_handler';

jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('@screens/navigation', () => ({
    navigateToHomeTab: jest.fn(),
}));

describe('useAndroidHomeTabBackHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should register a back handler that navigates to the home tab', () => {
        renderHook(() => useAndroidHomeTabBackHandler(Screens.SEARCH));

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            Screens.SEARCH,
            expect.any(Function),
        );

        const onBackPress = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        onBackPress();

        expect(navigateToHomeTab).toHaveBeenCalled();
    });
});
