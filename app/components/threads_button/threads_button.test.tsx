// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Threads from './threads_button';

const baseProps = {
    currentChannelId: 'someChannelId',
    unreadsAndMentions: {
        unreads: false,
        mentions: 0,
    },
};

describe('Thread item in the channel list', () => {
    test('Threads Component should match snapshot', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads {...baseProps}/>,
        );
        expect(toJSON()).toMatchSnapshot();
    });

    test('Threads Component should match snapshot with onCenterBg', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads
                {...baseProps}
                onCenterBg={true}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
