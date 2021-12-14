// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CategoryBody from './index';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

const channels = [
    {id: '1', displayName: 'Just a channel'},
    {id: '2', displayName: 'Highlighted!!!'},
] as Array<Partial<ChannelModel>>;

const category = {
    id: '1',
    displayName: 'Just a channel',
    channels,
} as unknown as CategoryModel;

test('Category Body Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <CategoryBody category={category}/>,
    );

    expect(toJSON()).toMatchSnapshot();
});
