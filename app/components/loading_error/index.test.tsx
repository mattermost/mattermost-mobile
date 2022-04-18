// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ErrorComponent from './index';

test('Loading Error should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <ErrorComponent
            loading={false}
            message='Error description'
            onRetry={() => true}
            title='Error title'
        />,
    );

    expect(toJSON()).toMatchSnapshot();
});
