// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import EmbeddedBinding from './embedded_binding';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    location: string;
    post: PostModel;
    theme: Theme;
}

const EmbeddedBindings = ({location, post, theme}: Props) => {
    const content: React.ReactNode[] = [];
    const embeds: AppBinding[] = post.props.app_bindings;

    embeds.forEach((embed, i) => {
        content.push(
            <EmbeddedBinding
                embed={embed}
                location={location}
                key={'binding_' + i.toString()}
                post={post}
                theme={theme}
            />,
        );
    });

    return (
        <View style={{flex: 1, flexDirection: 'column'}}>
            {content}
        </View>
    );
};

export default EmbeddedBindings;
