// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

import {isDirectMessageWithViewedUser} from './index';

describe('screens/user_profile/index', () => {
    it('should return true when viewing the DM counterpart user', () => {
        const result = isDirectMessageWithViewedUser(
            {
                name: 'current_user_id__other_user_id',
                type: General.DM_CHANNEL,
            },
            'current_user_id',
            'other_user_id',
        );

        expect(result).toBe(true);
    });

    it('should return false when viewing a user different from the DM counterpart', () => {
        const result = isDirectMessageWithViewedUser(
            {
                name: 'current_user_id__other_user_id',
                type: General.DM_CHANNEL,
            },
            'current_user_id',
            'someone_else',
        );

        expect(result).toBe(false);
    });

    it('should return false for non-DM channels', () => {
        const result = isDirectMessageWithViewedUser(
            {
                name: 'current_user_id__other_user_id',
                type: General.OPEN_CHANNEL,
            },
            'current_user_id',
            'other_user_id',
        );

        expect(result).toBe(false);
    });

    it('should return false when DM channel name is malformed', () => {
        const result = isDirectMessageWithViewedUser(
            {
                name: 'malformed_channel_name',
                type: General.DM_CHANNEL,
            },
            'current_user_id',
            'other_user_id',
        );

        expect(result).toBe(false);
    });
});
