// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {isAppBinding, validateBindings} from '@utils/apps';
import {isArrayOf} from '@utils/types';

import EmbeddedBinding from './embedded_binding';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
}

const EmbeddedBindings = ({location, post, theme}: Props) => {
    const content: React.ReactNode[] = [];
    const embeds: AppBinding[] = isArrayOf<AppBinding>(post.props?.app_bindings, isAppBinding) ? validateBindings(post.props.app_bindings) : [];

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
