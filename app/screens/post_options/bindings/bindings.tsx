// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {intlShape, injectIntl} from 'react-intl';

import {isSystemMessage} from '@mm-redux/utils/post_utils';

import PostOption from '../post_option';
import {AppBinding, AppCallRequest} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Post} from '@mm-redux/types/posts';
import {UserProfile} from '@mm-redux/types/users';
import {AppCallTypes, AppExpandLevels} from '@mm-redux/constants/apps';
import {ActionResult} from '@mm-redux/types/actions';

type Props = {
    bindings: AppBinding[],
    theme: Theme,
    post: Post,
    currentUser: UserProfile,
    closeWithAnimation: () => void,
    appsEnabled: boolean,
    actions: {
        doAppCall: (call: AppCallRequest, intl: any) => Promise<ActionResult>,
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
        doAppCall: (call: AppCallRequest, intl: any) => Promise<ActionResult>,
    },
}

const Option = injectIntl((props: OptionProps) => {
    const onPress = async () => {
        const {closeWithAnimation, post} = props;

        const res = await props.actions.doAppCall({
            ...binding.call,
            type: AppCallTypes.SUBMIT,
            path: props.binding.call?.path || '',
            expand: {
                post: AppExpandLevels.EXPAND_ALL,
                ...props.binding.call?.expand,
            },
            context: {
                app_id: props.binding.app_id,
                channel_id: post.channel_id,
                post_id: post.id,
                user_id: props.currentUser.id,
                location: props.binding.location,
            },
        }, props.intl);

        if (res?.data?.error) {
            Alert.alert(res.data.error);
            return;
        }

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
