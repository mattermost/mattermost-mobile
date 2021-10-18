// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import LoadingComponent from './index';

test('Loading Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <LoadingComponent/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
