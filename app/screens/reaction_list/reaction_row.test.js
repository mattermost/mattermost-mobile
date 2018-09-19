// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import ReactionRow from './reaction_row';

describe('ReactionRow', () => {
    const baseProps = {
        emojiName: 'smile',
        navigator: {},
        teammateNameDisplay: 'username',
        theme: {
            centerChannelColor: '#aaa',
        },
        user: {id: 'user_id', username: 'username'},
    };

    test('should match snapshot, renderContent', () => {
        const wrapper = shallow(
            <ReactionRow {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
