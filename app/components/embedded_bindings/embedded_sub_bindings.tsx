// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import BindingMenu from './menu_binding';
import ButtonBinding from './button_binding';
import {AppBinding} from '@mm-redux/types/apps';

type Props = {
    bindings?: AppBinding[];
    postId: string;
}
export default function EmbeddedSubBindings(props: Props) {
    const {
        bindings,
        postId,
    } = props;

    if (!bindings?.length) {
        return null;
    }

    const content = [] as React.ReactNode[];

    bindings.forEach((binding) => {
        if (!binding.app_id || !binding.call) {
            return;
        }

        if ((binding.bindings?.length || 0) > 0) {
            content.push(
                <BindingMenu
                    key={binding.location}
                    binding={binding}
                    postId={postId}
                />,
            );
            return;
        }

        content.push(
            <ButtonBinding
                key={binding.location}
                binding={binding}
                postId={postId}
            />,
        );
    });

    return content.length ? (<>{content}</>) : null;
}
