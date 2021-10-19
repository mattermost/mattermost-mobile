// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelsList from './index';

test('Channels List should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <ChannelsList/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
