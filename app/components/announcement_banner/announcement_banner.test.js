// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import AnnouncementBanner from './announcement_banner.js';

jest.useFakeTimers();

describe('AnnouncementBanner', () => {
    const baseProps = {
        bannerColor: '#ddd',
        bannerDismissed: false,
        bannerEnabled: true,
        bannerText: 'Banner Text',
        bannerTextColor: '#fff',
        navigator: {},
        theme: {},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <AnnouncementBanner {...baseProps}/>
        );

        expect(wrapper).toMatchSnapshot();

        wrapper.setProps({bannerEnabled: false});
        expect(wrapper).toMatchSnapshot();
    });
});
