// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {intlShape, injectIntl} from 'react-intl';

import Separator from '@screens/channel_info/separator';

import ChannelInfoRow from '../channel_info_row';
import {AppBinding, AppCallRequest, AppCallResponse, AppCallType} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Channel} from '@mm-redux/types/channels';
import {AppCallResponseTypes, AppCallTypes} from '@mm-redux/constants/apps';
import {dismissModal} from '@actions/navigation';
import {ActionResult} from '@mm-redux/types/actions';
import {createCallContext, createCallRequest} from '@utils/apps';

type Props = {
    bindings: AppBinding[];
    theme: Theme;
    currentChannel: Channel;
    appsEnabled: boolean;
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        sendEphemeralPost: (message: any, channelId?: string, parentId?: string) => Promise<ActionResult>;
    }
}

const Bindings: React.FC<Props> = (props: Props) => {
    if (!props.appsEnabled) {
        return null;
    }

    const {bindings, ...optionProps} = props;
    if (bindings.length === 0) {
        return null;
    }

    const options = bindings.map((b) => (
        <Option
            key={b.app_id + b.location}
            binding={b}
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
    binding: AppBinding;
    theme: Theme;
    currentChannel: Channel;
    intl: typeof intlShape;
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        sendEphemeralPost: (message: any, channelId?: string, parentId?: string) => Promise<ActionResult>;
    },
}

const Option = injectIntl((props: OptionProps) => {
    const onPress = async () => {
        if (!binding.call) {
            return;
        }
        const context = createCallContext(
            binding.app_id,
            binding.location,
            props.currentChannel.id,
            props.currentChannel.team_id,
        );
        const call = createCallRequest(
            binding.call,
            context,
        );

        const res = await props.actions.doAppCall(call, AppCallTypes.SUBMIT, props.intl);
        if (res.error) {
            const errorResponse = res.error;
            const title = props.intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errorMessage = errorResponse.error || props.intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error happenned',
            });
            Alert.alert(title, errorMessage);
            dismissModal();
            return;
        }

        const callResp = res.data!;
        const ephemeral = (message: string) => props.actions.sendEphemeralPost(message, props.currentChannel.id);
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

        dismissModal();
    };

    const {binding, theme} = props;
    if (!binding.label) {
        return null;
    }
    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                action={onPress}
                defaultMessage={binding.label}
                theme={theme}
                textId={binding.app_id + binding.location}
                image={binding.icon ? {uri: binding.icon} : null}
            />
        </>
    );
});
