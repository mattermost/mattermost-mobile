// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {intlShape, injectIntl} from 'react-intl';
import {Alert} from 'react-native';

import {dismissModal, showAppForm} from '@actions/navigation';
import {AppCallResponseTypes} from '@mm-redux/constants/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {AppBinding} from '@mm-redux/types/apps';
import {Channel} from '@mm-redux/types/channels';
import {Theme} from '@mm-redux/types/theme';
import {HandleBindingClick, PostEphemeralCallResponseForChannel} from '@mm-types/actions/apps';
import Separator from '@screens/channel_info/separator';
import {createCallContext} from '@utils/apps';

import ChannelInfoRow from '../channel_info_row';

type Props = {
    bindings: AppBinding[];
    theme: Theme;
    currentChannel?: Channel;
    appsEnabled: boolean;
    intl: typeof intlShape;
    currentTeamId: string;
    actions: {
        handleBindingClick: HandleBindingClick;
        postEphemeralCallResponseForChannel: PostEphemeralCallResponseForChannel;
        handleGotoLocation: (href: string, intl: any) => Promise<ActionResult>;
    };
}

const Bindings: React.FC<Props> = injectIntl((props: Props) => {
    const {bindings, currentChannel, appsEnabled, ...optionProps} = props;
    if (!appsEnabled) {
        return null;
    }

    if (!currentChannel) {
        return null;
    }

    if (bindings.length === 0) {
        return null;
    }

    const options = bindings.map((b) => (
        <Option
            key={b.app_id + b.location}
            binding={b}
            currentChannel={currentChannel}
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
        handleBindingClick: HandleBindingClick;
        postEphemeralCallResponseForChannel: PostEphemeralCallResponseForChannel;
        handleGotoLocation: (href: string, intl: any) => Promise<ActionResult>;
    };
}

type OptionState = {
    submitting: boolean;
}

class Option extends React.PureComponent<OptionProps, OptionState> {
    state = {
        submitting: false,
    };

    onPress = async () => {
        const {binding, currentChannel, currentTeamId, intl, theme} = this.props;
        const {handleBindingClick, postEphemeralCallResponseForChannel} = this.props.actions;

        if (this.state.submitting) {
            return;
        }

        const context = createCallContext(
            binding.app_id,
            binding.location,
            currentChannel.id,
            currentChannel.team_id || currentTeamId,
        );

        this.setState({submitting: true});

        const res = await handleBindingClick(binding, context, intl);

        this.setState({submitting: false});

        if (res.error) {
            const errorResponse = res.error;
            const title = intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errorMessage = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            Alert.alert(title, errorMessage);
            return;
        }

        const callResp = res.data!;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.text) {
                postEphemeralCallResponseForChannel(callResp, callResp.text, currentChannel.id);
            }
            break;
        case AppCallResponseTypes.NAVIGATE:
            await dismissModal();
            this.props.actions.handleGotoLocation(callResp.navigate_to_url!, intl);
            return;
        case AppCallResponseTypes.FORM:
            await dismissModal();
            showAppForm(callResp.form, context, theme);
            return;
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
                    image={binding.icon ? {uri: binding.icon} : null}
                />
            </>
        );
    }
}
