// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';

import ChannelListHeader from './header';

test('Channel List Header Component should match snapshot', () => {
    const {toJSON} = renderWithEverything(<ChannelListHeader teamName='Contributors'/>);

    expect(toJSON()).toMatchSnapshot();
});
