// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import Markdown from './markdown.js';

describe('Markdown', () => {
    const baseProps = {
        autolinkedUrlSchemes: ['mattermost'],
        baseTextStyle: {},
        mentionKeys: [{key: 'user.name'}, {key: '@channel'}, {key: '@all'}, {key: '@here'}],
        minimumHashtagLength: 3,
        theme: {},
        value: 'This is a message containing @all',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Markdown {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match with disableAtChannelMentionHighlight', () => {
        const wrapper = shallow(
            <Markdown
                {...baseProps}
                disableAtChannelMentionHighlight={true}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
