// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {intlShape, injectIntl} from 'react-intl';

import {isSystemMessage} from '@mm-redux/utils/post_utils';

import PostOption from '../post_option';
import {AppBinding, AppCallRequest, AppCallResponse, AppCallType} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Post} from '@mm-redux/types/posts';
import {UserProfile} from '@mm-redux/types/users';
import {AppCallResponseTypes, AppCallTypes, AppExpandLevels} from '@mm-redux/constants/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {createCallContext, createCallRequest} from '@utils/apps';

type Props = {
    bindings: AppBinding[],
    theme: Theme,
    post: Post,
    currentUser: UserProfile,
    teamID: string,
    closeWithAnimation: () => void,
    appsEnabled: boolean,
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        sendEphemeralPost: (message: any, channelId?: string, parentId?: string) => Promise<ActionResult>;
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
    teamID: string,
    closeWithAnimation: () => void,
    intl: typeof intlShape,
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        sendEphemeralPost: (message: any, channelId?: string, parentId?: string) => Promise<ActionResult>;
    },
}

const Option = injectIntl((props: OptionProps) => {
    const onPress = async () => {
        const {closeWithAnimation, post, teamID} = props;

        if (!binding.call) {
            return;
        }
        const context = createCallContext(
            binding.app_id,
            binding.location,
            post.channel_id,
            teamID,
            post.id,
            post.root_id,
        );
        const call = createCallRequest(
            binding.call,
            context,
            {
                post: AppExpandLevels.ALL,
            },
        );
        const res = await props.actions?.doAppCall(call, AppCallTypes.SUBMIT, props.intl);
        if (res.error) {
            const errorResponse = res.error;
            const title = props.intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errorMessage = errorResponse.error || props.intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            Alert.alert(title, errorMessage);
            closeWithAnimation();
            return;
        }

        const callResp = (res as {data: AppCallResponse}).data;
        const ephemeral = (message: string) => props.actions.sendEphemeralPost(message, props.post.channel_id, props.post.root_id || props.post.id);
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.markdown) {
                ephemeral(callResp.markdown);
            }
            break;
        case AppCallResponseTypes.NAVIGATE:
        case AppCallResponseTypes.FORM:
            break;
        default: {
            const title = props.intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errMessage = props.intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            });
            Alert.alert(title, errMessage);
        }
        }

        closeWithAnimation();
    };

    const {binding, theme} = props;
    if (!binding.label) {
        return null;
    }

    return (
        <PostOption
            icon={{uri: binding.icon}}
            text={binding.label}
            onPress={onPress}
            theme={theme}
        />
    );
});
