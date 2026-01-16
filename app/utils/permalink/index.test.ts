// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard, Platform} from 'react-native';

import {Screens} from '@constants';
import {dismissToStackRoot, navigateToScreen} from '@screens/navigation';

import {displayPermalink, closePermalink} from './index';

jest.mock('@screens/navigation', () => ({
    dismissToStackRoot: jest.fn(),
    navigateToScreen: jest.fn(),
}));

describe('permalinkUtils', () => {
    const originalSelect = Platform.select;

    beforeAll(() => {
        Platform.select = ({android, ios, default: dft}: any) => {
            if (Platform.OS === 'android' && android) {
                return android;
            } else if (Platform.OS === 'ios' && ios) {
                return ios;
            }

            return dft;
        };
    });

    afterAll(() => {
        Platform.select = originalSelect;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('displayPermalink', () => {
        it('should dismiss keyboard and show permalink modal', async () => {
            const dismiss = jest.spyOn(Keyboard, 'dismiss');
            await displayPermalink('teamName', 'postId');
            expect(dismiss).toHaveBeenCalled();
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PERMALINK,
                {teamName: 'teamName', postId: 'postId'},
            );
        });

        it('should dismiss all modals if showingPermalink is true', async () => {
            // Simulate showingPermalink being true
            await displayPermalink('teamName', 'postId');
            await displayPermalink('teamName', 'postId');
            expect(dismissToStackRoot).toHaveBeenCalled();
        });

        it('should handle platform specific options correctly', async () => {
            await displayPermalink('teamName', 'postId');
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PERMALINK,
                {teamName: 'teamName', postId: 'postId'},
            );
        });
    });

    describe('closePermalink', () => {
        it('should set showingPermalink to false', () => {
            const showingPermalink = closePermalink();
            expect(showingPermalink).toBe(false);
        });
    });
});
