// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import AtMention from './at_mention.js';

describe('AtMention', () => {
    const baseProps = {
        usersByUsername: {},
        mentionKeys: [{key: 'John.Smith'}, {key: 'Jane.Doe'}],
        teammateNameDisplay: '',
        mentionName: 'John.Smith',
        mentionStyle: {color: '#ff0000'},
        textStyle: {backgroundColor: 'yellow'},
        theme: {},
    };

    test('should match snapshot, no highlight', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, with highlight', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>,
        );

        wrapper.setState({user: {username: 'John.Smith'}});
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, without highlight', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>,
        );

        wrapper.setState({user: {username: 'Victor.Welch'}});
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
