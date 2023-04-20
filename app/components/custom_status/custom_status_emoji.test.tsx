// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import {CustomStatusDurationEnum} from '@constants/custom_status';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import type Database from '@nozbe/watermelondb/Database';

describe('components/custom_status/custom_status_emoji', () => {
    let database: Database | undefined;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    const customStatus: UserCustomStatus = {
        emoji: 'calendar',
        text: 'In a meeting',
        duration: CustomStatusDurationEnum.DONT_CLEAR,
    };
    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <CustomStatusEmoji
                customStatus={customStatus}
            />,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with props', () => {
        const wrapper = renderWithEverything(
            <CustomStatusEmoji
                customStatus={customStatus}
                emojiSize={34}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
