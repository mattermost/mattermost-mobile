// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {intlShape, injectIntl} from 'react-intl';

import {isSystemMessage} from '@mm-redux/utils/post_utils';

import PostOption from '../post_option';
import {AppBinding, AppCall} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Post} from '@mm-redux/types/posts';
import {UserProfile} from '@mm-redux/types/users';
import {AppCallTypes, AppExpandLevels} from '@mm-redux/constants/apps';

type Props = {
    bindings: AppBinding[],
    theme: Theme,
    post: Post,
    currentUser: UserProfile,
    closeWithAnimation: () => void,
    appsEnabled: boolean,
    actions: {
        doAppCall: (call: AppCall, intl: any) => void
    }
}

const Bindings = (props: Props) => {
    if (!props.appsEnabled) {
        return null;
    }

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
    closeWithAnimation: () => void,
    intl: typeof intlShape,
    actions: {
        doAppCall: (call: AppCall, intl: any) => void,
    },
}

const Option = injectIntl((props: OptionProps) => {
    const onPress = () => {
        const {closeWithAnimation, post} = props;

        props.actions.doAppCall({
            type: AppCallTypes.SUBMIT,
            path: props.binding.call?.path || '',
            values: {
                ...props.binding.call?.values,
            },
            expand: {
                post: AppExpandLevels.EXPAND_ALL,
                ...props.binding.call?.expand,
            },
            context: {
                app_id: props.binding.app_id,
                channel_id: post.channel_id,
                post_id: post.id,
                user_id: props.currentUser.id,
            },
        }, props.intl);
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
});
