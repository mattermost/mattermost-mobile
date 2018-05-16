// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import AnnouncementBanner from './announcement_banner.js';

jest.useFakeTimers();

describe('AnnouncementBanner', () => {
    const baseProps = {
        actions: {
            dismissBanner: jest.fn(),
        },
        allowDismissal: true,
        bannerColor: '#ddd',
        bannerDismissed: false,
        bannerEnabled: true,
        bannerText: 'Banner Text',
        bannerTextColor: '#fff',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <AnnouncementBanner {...baseProps}/>
        );

        expect(wrapper).toMatchSnapshot();

        wrapper.setProps({bannerEnabled: false});
        expect(wrapper).toMatchSnapshot();
    });

    test('should call actions.dismissBanner on handleDismiss', () => {
        const actions = {dismissBanner: jest.fn()};
        const props = {...baseProps, actions};
        const wrapper = shallow(
            <AnnouncementBanner {...props}/>
        );

        wrapper.instance().handleDismiss();
        expect(actions.dismissBanner).toHaveBeenCalledTimes(1);
        expect(actions.dismissBanner).toHaveBeenCalledWith(props.bannerText);
    });
});