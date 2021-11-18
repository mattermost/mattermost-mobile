// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import CallAvatar from './call_avatar';

describe('CallAvatar', () => {
    const baseProps = {
        userId: 'user-id',
        volume: 1,
        muted: false,
        size: 'm',
    };

    test('should match snapshot unmuted', () => {
        const wrapper = shallow(<CallAvatar {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot muted', () => {
        const props = {...baseProps, muted: true};
        const wrapper = shallow(<CallAvatar {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot size large', () => {
        const props = {...baseProps, size: 'l'};
        const wrapper = shallow(<CallAvatar {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
