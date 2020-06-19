// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import {View} from 'react-native';

import {Post} from '@mm-redux/types/posts';

type Props = {
    post: Post;
}

class SampleMobilePluginPost extends React.PureComponent<Props> {
    render() {
        return (
            <View>
                {'Sample post type'}
            </View>
        );
    }
}

export default class PluginClass {
    initialize(registry: any) {
        registry.registerPostTypeComponent('custom_sample_mobile_plugin', (props: {post: Post}) => (<SampleMobilePluginPost post={props.post}/>));
    }
}
