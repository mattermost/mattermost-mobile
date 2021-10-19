// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Search from './index';

test('Search Field should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <Search/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
