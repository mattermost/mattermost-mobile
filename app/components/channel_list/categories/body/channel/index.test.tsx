// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {COMPASS_ICONS} from '@app/components/compass_icon';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelItem from './index';

test('Category Channel List Item should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <ChannelItem
            icon={COMPASS_ICONS.globe}
            name='Channel Name'
        />,
    );

    expect(toJSON()).toMatchSnapshot();
});
