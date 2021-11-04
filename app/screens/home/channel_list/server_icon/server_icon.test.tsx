// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Icon from './server_icon';

test('Server Icon Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <Icon/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
