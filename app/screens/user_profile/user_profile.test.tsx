// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shouldShowUserProfileOptions} from './user_profile';

describe('screens/user_profile/user_profile', () => {
    it('should hide profile options when viewing the same user in a DM from channel context', () => {
        const shouldShow = shouldShowUserProfileOptions({
            channelContext: true,
            isDirectMessageWithUser: true,
            manageMode: false,
            override: false,
        });

        expect(shouldShow).toBe(false);
    });

    it('should show profile options when viewing another user in a DM from channel context', () => {
        const shouldShow = shouldShowUserProfileOptions({
            channelContext: true,
            isDirectMessageWithUser: false,
            manageMode: false,
            override: false,
        });

        expect(shouldShow).toBe(true);
    });

    it('should hide profile options when in manage mode', () => {
        const shouldShow = shouldShowUserProfileOptions({
            channelContext: true,
            isDirectMessageWithUser: false,
            manageMode: true,
            override: false,
        });

        expect(shouldShow).toBe(false);
    });

    it('should hide profile options when override is enabled', () => {
        const shouldShow = shouldShowUserProfileOptions({
            channelContext: false,
            isDirectMessageWithUser: false,
            manageMode: false,
            override: true,
        });

        expect(shouldShow).toBe(false);
    });

    it('should show profile options outside channel context even for direct message with viewed user', () => {
        const shouldShow = shouldShowUserProfileOptions({
            channelContext: false,
            isDirectMessageWithUser: true,
            manageMode: false,
            override: false,
        });

        expect(shouldShow).toBe(true);
    });
});
