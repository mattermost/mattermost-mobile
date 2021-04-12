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
import {createCallContext, createCallRequest} from '@utils/apps';
import {SendEphemeralPost} from 'types/actions/posts';

type Props = {
    bindings: AppBinding[];
    theme: Theme;
    currentChannel: Channel;
    appsEnabled: boolean;
    intl: typeof intlShape;
    currentTeamId: string;
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        sendEphemeralPost: SendEphemeralPost;
    }
}

const Bindings: React.FC<Props> = injectIntl((props: Props) => {
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
});

export default Bindings;

type OptionProps = {
    binding: AppBinding;
    theme: Theme;
    currentChannel: Channel;
    intl: typeof intlShape;
    currentTeamId: string;
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        sendEphemeralPost: SendEphemeralPost;
    },
}

type OptionState = {
    submitting: boolean;
}

class Option extends React.PureComponent<OptionProps, OptionState> {
    state = {
        submitting: false,
    };

    onPress = async () => {
        const {binding, currentChannel, currentTeamId, intl} = this.props;
        const {doAppCall, sendEphemeralPost} = this.props.actions;

        if (this.state.submitting) {
            return;
        }

        if (!binding.call) {
            return;
        }

        const context = createCallContext(
            binding.app_id,
            binding.location,
            currentChannel.id,
            currentChannel.team_id || currentTeamId,
        );
        const call = createCallRequest(
            binding.call,
            context,
        );

        this.setState({submitting: true});

        const res = await doAppCall(call, AppCallTypes.SUBMIT, intl);

        this.setState({submitting: false});

        if (res.error) {
            const errorResponse = res.error;
            const title = intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errorMessage = errorResponse.error || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            Alert.alert(title, errorMessage);
            return;
        }

        const callResp = res.data!;
        const ephemeral = (message: string) => sendEphemeralPost(message, currentChannel.id, '', callResp.app_metadata?.bot_user_id);
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
            const title = intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errMessage = intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            });
            Alert.alert(title, errMessage);
            return;
        }
        }

        dismissModal();
    };

    render() {
        const {binding, theme} = this.props;
        if (!binding.label) {
            return null;
        }
        return (
            <>
                <Separator theme={theme}/>
                <ChannelInfoRow
                    action={this.onPress}
                    defaultMessage={binding.label}
                    theme={theme}
                    textId={binding.app_id + binding.location}
                    image={binding.icon ? {uri: binding.icon} : null}
                />
            </>
        );
    }
}
