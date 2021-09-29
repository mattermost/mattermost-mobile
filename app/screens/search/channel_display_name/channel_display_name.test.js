// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import {Preferences} from '@mm-redux/constants';

import ChannelDisplayName from './channel_display_name';

describe('SearchResultPost', () => {
    const baseProps = {
        displayName: 'channel',
        teamName: '',
        theme: Preferences.THEMES.denim,
    };

    test('should match snapshot when no team is provided', async () => {
        const wrapper = shallow(<ChannelDisplayName {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when team is provided', async () => {
        const props = {
            ...baseProps,
            teamName: 'team',
        };
        const wrapper = shallow(<ChannelDisplayName {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
