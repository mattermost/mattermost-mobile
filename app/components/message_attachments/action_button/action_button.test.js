// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import ActionButton from './action_button';
import {changeOpacity} from 'app/utils/theme';
import {STATUS_COLORS} from 'app/constants/colors';

import Preferences from 'mattermost-redux/constants/preferences';

describe('ActionButton', () => {
    const actions = [
        {
            id: 'gpc1tihowbfmmcizofm7zhr1to',
            name: 'Option 1',
            style: 'danger',
        },
        {
            id: 'gpc1tihowddto',
            name: 'Option 2',
            style: 'default',
        },
        {
            id: 'gpc1tihowbfmmcizddo',
            name: 'Option 3',
        },
        {
            id: 'gpc1tihowbfawemmcizddo',
            name: 'Option 4',
            style: '#166de0',
        },
        {
            id: 'gpc1tihowfabfmmcizddo',
            name: 'Option 5',
            style: 'onlineIndicator',
        },
    ];

    actions.forEach(({id, name, style}) => {
        test('custom action button style: ' + style, () => {
            const baseProps = {
                id,
                cookie: '',
                name,
                postId: id,
                style,
                theme: Preferences.THEMES.default,
                actions: {
                    doPostActionWithCookie: jest.fn(),
                },
            };

            const wrapper = shallow(<ActionButton {...baseProps}/>);

            const buttonTextChild = wrapper.getElement().props.children;

            expect(wrapper.getElement().props.containerStyle[0].borderColor).toBe(changeOpacity(Preferences.THEMES.default.centerChannelColor, 0.25));
            expect(wrapper.getElement().props.containerStyle[0].borderWidth).toBe(2);
            expect(wrapper.getElement().props.containerStyle[0].borderRadius).toBe(4);

            if (STATUS_COLORS[style]) {
                expect(wrapper.getElement().props.containerStyle[1].borderColor).toBe(changeOpacity(STATUS_COLORS[style], 0.25));
                expect(buttonTextChild.props.style.color).toBe(STATUS_COLORS[style]);
            } else if (Preferences.THEMES.default[style]) {
                expect(wrapper.getElement().props.containerStyle[1].borderColor).toBe(changeOpacity(Preferences.THEMES.default[style], 0.25));
                expect(buttonTextChild.props.style.color).toBe(Preferences.THEMES.default[style]);
            } else if (style) {
                expect(wrapper.getElement().props.containerStyle[1].borderColor).toBe(changeOpacity(style, 0.25));
                expect(buttonTextChild.props.style.color).toBe(style);
            } else {
                expect(wrapper.getElement().props.containerStyle[1]).toBe(undefined);
                expect(buttonTextChild.props.style.color).toBe(Preferences.THEMES.default.centerChannelColor);
            }
        });
    });
});