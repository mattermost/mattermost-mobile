// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';

import ChannelsList from './list';

test('Channels List should match snapshot', () => {
    const {toJSON} = renderWithEverything(
        <ChannelsList currentTeamId='team-id'/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
