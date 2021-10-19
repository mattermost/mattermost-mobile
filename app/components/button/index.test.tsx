// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ButtonComponent from './index';

describe('Button Component; Size / Emphasis / Type / State', () => {
    test('DEFAULTS: Size [M] / Emphasis [Primary] / Type [default] / State [default]', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <ButtonComponent text='A Button!'/>,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});

