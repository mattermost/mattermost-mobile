// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Category from './index';

const channels: TempoChannel[] = [
    {id: '1', name: 'Just a channel'},
    {id: '2', name: 'Highlighted!!!', highlight: true},
];

const categories: TempoCategory[] = [
    {id: '1', title: 'My first Category', channels},
    {id: '2', title: 'Another cat', channels},
];

test('Category List Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <Category categories={categories}/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
