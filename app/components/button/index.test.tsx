// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ButtonComponent from './index';

test('Button Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <ButtonComponent text='A Button!'/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
