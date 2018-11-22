// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import MarkdownEmoji from './markdown_emoji';

describe('MarkdownEmoji', () => {
    const baseProps = {
        baseTextStyle: {color: '#3d3c40', fontSize: 15, lineHeight: 20},
        isEdited: false,
        shouldRenderJumboEmoji: true,
        theme: Preferences.THEMES.default,
        value: ':smile:',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <MarkdownEmoji {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
