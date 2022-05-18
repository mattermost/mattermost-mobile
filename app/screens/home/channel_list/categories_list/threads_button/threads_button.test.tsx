// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Threads from './threads_button';

describe('Thread item in the channel list', () => {
    test('Threads Component should match snapshot', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads
                currentChannelId='someChannelId'
                onlyUnreads={false}
                unreadsAndMentions={{
                    unreads: 0,
                    mentions: 0,
                }}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });

    test('Threads Component should match snapshot with only unreads filter', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads
                currentChannelId='someChannelId'
                onlyUnreads={true}
                unreadsAndMentions={{
                    unreads: 0,
                    mentions: 0,
                }}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
