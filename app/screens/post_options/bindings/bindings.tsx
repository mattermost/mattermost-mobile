// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {isSystemMessage} from '@mm-redux/utils/post_utils';

import PostOption from '../post_option';
import {AppBinding} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Post} from '@mm-redux/types/posts';
import {doAppCall} from '@actions/apps';
import {UserProfile} from '@mm-redux/types/users';

type Props = {
    bindings: AppBinding[],
    theme: Theme,
    post: Post,
    currentUser: UserProfile,
    closeWithAnimation: () => void,
}

const Bindings = (props: Props) => {
    const {bindings, post, ...optionProps} = props;
    if (bindings.length === 0) {
        return null;
    }

    if (isSystemMessage(post)) {
        return null;
    }

    const options = bindings.map((b) => (
        <Option
            key={b.app_id + b.location}
            binding={b}
            post={post}
            {...optionProps}
        />
    ));

    return (
        <>
            {options}
        </>
    );
};

export default Bindings;

type OptionProps = {
    binding: AppBinding,
    theme: Theme,
    post: Post,
    currentUser: UserProfile,
    closeWithAnimation: () => void;
}

const Option = (props: OptionProps) => {
    const onPress = () => {
        const {closeWithAnimation, post} = props;

        // TODO consider handling result here
        doAppCall({
            url: props.binding.call?.url || '',
            context: {
                app_id: props.binding.app_id,
                channel_id: post.channel_id,
                post_id: post.id,
                user_id: props.currentUser.id,
            },
        });
        closeWithAnimation();
    };

    const {binding, theme} = props;
    return (
        <PostOption
            icon={{uri: binding.icon}}
            text={binding.label}
            onPress={onPress}
            theme={theme}
        />
    );
};
