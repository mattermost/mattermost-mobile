// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {shallow, mount} from 'enzyme';

import PostBody from '@components/post_body/post_body.jsx';

class PostTypePlugin extends React.PureComponent {
    render() {
        return <View>{'PostTypePlugin'}</View>;
    }
}

describe('plugins/PostBody', () => {
    const post = {type: 'testtype', message: 'this is some text', id: 'post_id'};
    const pluginPostTypes = {
        testtype: {component: PostTypePlugin},
    };

    const requiredProps = {
        channelIsReadOnly: false,
        deviceHeight: 640,
        post,
        postProps: post.props,
        postType: post.type,
        showLongPost: false,
        isEmojiOnly: false,
        shouldRenderJumboEmoji: false,
        pluginPostTypes,
    };

    test('should match snapshot with extended post type', () => {
        const wrapper = mount(
            <PostBody {...requiredProps}/>,
        );

        expect(wrapper).toMatchSnapshot();
        expect(wrapper.find('#pluginId').text()).toBe('PostTypePlugin');
    });

    test('should match snapshot with no extended post type', () => {
        const props = {...requiredProps, pluginPostTypes: {}};
        const wrapper = shallow(
            <PostBody {...props}/>,
        );

        expect(wrapper).toMatchSnapshot();
    });
});
