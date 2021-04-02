// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import Button from 'react-native-button';
import {intlShape} from 'react-intl';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {getStatusColors} from '@utils/message_attachment_colors';
import ButtonBindingText from './button_binding_text';
import {Theme} from '@mm-redux/types/preferences';
import {ActionResult} from '@mm-redux/types/actions';
import {AppBinding, AppCallRequest, AppCallResponse, AppCallType} from '@mm-redux/types/apps';
import {Post} from '@mm-redux/types/posts';
import {AppExpandLevels, AppBindingLocations, AppCallTypes, AppCallResponseTypes} from '@mm-redux/constants/apps';
import {createCallContext, createCallRequest} from '@utils/apps';
import {Channel} from '@mm-redux/types/channels';
import {SendEphemeralPost} from 'types/actions/posts';

type Props = {
    actions: {
        doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<{data?: AppCallResponse, error?: AppCallResponse}>;
        getChannel: (channelId: string) => Promise<ActionResult>;
        sendEphemeralPost: SendEphemeralPost;
    };
    post: Post;
    binding: AppBinding;
    theme: Theme;
    currentTeamID: string;
}
export default class ButtonBinding extends PureComponent<Props> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    private mounted = false;

    handleActionPress = preventDoubleTap(async () => {
        const {
            binding,
            post,
            currentTeamID,
        } = this.props;
        const intl = this.context.intl;
        if (!binding.call) {
            return;
        }

        let teamID = '';
        const {data} = await this.props.actions.getChannel(post.channel_id) as {data?: any; error?: any};
        if (data) {
            const channel = data as Channel;
            teamID = channel.team_id;
        }

        const context = createCallContext(
            binding.app_id,
            AppBindingLocations.IN_POST + binding.location,
            post.channel_id,
            teamID || currentTeamID,
            post.id,
        );
        const call = createCallRequest(
            binding.call,
            context,
            {post: AppExpandLevels.EXPAND_ALL},
        );
        this.setState({executing: true});
        const res = await this.props.actions.doAppCall(call, AppCallTypes.SUBMIT, this.context.intl);
        if (this.mounted) {
            this.setState({executing: false});
        }

        const ephemeral = (message: string) => this.props.actions.sendEphemeralPost(message, this.props.post.channel_id, this.props.post.root_id, res.data?.app_metadata?.bot_user_id);
        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.error || intl.formatMessage(
                {id: 'apps.error.unknown',
                    defaultMessage: 'Unknown error occurred.',
                });
            ephemeral(errorMessage);
            return;
        }

        const callResp = res.data!;

        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.markdown) {
                ephemeral(callResp.markdown);
            }
            return;
        case AppCallResponseTypes.NAVIGATE:
        case AppCallResponseTypes.FORM:
            return;
        default: {
            const errorMessage = intl.formatMessage(
                {
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                },
                {
                    type: callResp.type,
                },
            );
            ephemeral(errorMessage);
        }
        }
    }, 4000);

    componentDidMount() {
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    render() {
        const {theme, binding} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Button
                containerStyle={[style.button]}
                disabledContainerStyle={style.buttonDisabled}
                onPress={this.handleActionPress}
            >
                <ButtonBindingText
                    message={binding.label}
                    style={style.text}
                />
            </Button>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const STATUS_COLORS = getStatusColors(theme);
    return {
        button: {
            borderRadius: 4,
            borderColor: changeOpacity(STATUS_COLORS.default, 0.25),
            borderWidth: 2,
            opacity: 1,
            alignItems: 'center',
            marginTop: 12,
            justifyContent: 'center',
            height: 36,
        },
        buttonDisabled: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        text: {
            color: STATUS_COLORS.default,
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 17,
        },
    };
});
