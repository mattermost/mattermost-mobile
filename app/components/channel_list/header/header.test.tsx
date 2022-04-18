// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import Header from './header';

describe('components/channel_list/header', () => {
    it('Channel List Header Component should match snapshot', () => {
        const {toJSON} = renderWithIntl(
            <Header
                canCreateChannels={true}
                canJoinChannels={true}
                displayName={'Test!'}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
