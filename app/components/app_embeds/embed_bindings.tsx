// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import BindingMenu from './binding_menu';
import BindingButton from './binding_button';
import {Post} from '@mm-redux/types/posts';
import {AppBinding} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';

type Props = {
    bindings?: AppBinding[];
    post: Post;
    theme: Theme;
}
export default function EmbedBindings(props: Props) {
    const {
        bindings,
        post,
        theme,
    } = props;

    if (!bindings?.length) {
        return null;
    }

    const content = [] as JSX.Element[];

    bindings.forEach((binding) => {
        if (!binding.app_id || !binding.call) {
            return;
        }

        if ((binding.bindings?.length || 0) > 0) {
            content.push(
                <BindingMenu
                    key={binding.location}
                    binding={binding}
                    post={post}
                    theme={theme}
                />,
            );
            return;
        }

        content.push(
            <BindingButton
                key={binding.location}
                binding={binding}
                post={post}
            />,
        );
    });

    return content.length ? (<>{content}</>) : null;
}
