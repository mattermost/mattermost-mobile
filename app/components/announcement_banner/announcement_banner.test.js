// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import AnnouncementBanner from './announcement_banner.js';

jest.useFakeTimers();

describe('AnnouncementBanner', () => {
    const baseProps = {
        actions: {
            goToScreen: jest.fn(),
        },
        bannerColor: '#ddd',
        bannerDismissed: false,
        bannerEnabled: true,
        bannerText: 'Banner Text',
        bannerTextColor: '#fff',
        theme: Preferences.THEMES.default,
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <AnnouncementBanner {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();

        wrapper.setProps({bannerEnabled: false});
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
