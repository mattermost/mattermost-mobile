// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Header from './index';

test('Channel List Header Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <Header heading='Hello World!'/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
