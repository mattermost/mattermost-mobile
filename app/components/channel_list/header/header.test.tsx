// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {render} from '@test/intl-test-helper';
import TeamModel from '@typings/database/models/servers/team';

import Header from './header';

describe('components/channel_list/header', () => {
    it('Channel List Header Component should match snapshot', () => {
        const {toJSON} = render(
            <Header team={{displayName: 'Test!'} as TeamModel}/>,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
