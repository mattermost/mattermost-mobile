// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CategoryBody from './index';

const channels: TempoChannel[] = [
    {id: '1', name: 'Just a channel'},
    {id: '2', name: 'Highlighted!!!', highlight: true},
];

test('Category Body Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <CategoryBody channels={channels}/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
