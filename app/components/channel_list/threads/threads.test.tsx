// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Threads from './threads';

test('Threads Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <Threads isCRTEnabled={true}/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
