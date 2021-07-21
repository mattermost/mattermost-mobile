// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import AttachmentFooter from './attachment_footer';

import Preferences from '@mm-redux/constants/preferences';

describe('AttachmentFooter', () => {
    const baseProps = {
        text: 'This is the footer!',
        icon: 'https://images.com/image.png',
        theme: Preferences.THEMES.default,
    };

    test('it matches snapshot when footer text is provided', () => {
        const props = {
            ...baseProps,
            icon: undefined,
        };

        const wrapper = shallow(<AttachmentFooter {...props}/>);
        expect(wrapper).toMatchSnapshot();
    });

    test('it matches snapshot when both footer and footer_icon are provided', () => {
        const wrapper = shallow(<AttachmentFooter {...baseProps}/>);
        expect(wrapper).toMatchSnapshot();
    });
});
