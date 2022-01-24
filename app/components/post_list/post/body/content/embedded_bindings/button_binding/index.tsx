// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {useCallback, useRef} from 'react';
import {useIntl} from 'react-intl';
import Button from 'react-native-button';
import {map} from 'rxjs/operators';

import {doAppCall, postEphemeralCallResponseForPost} from '@actions/remote/apps';
import {AppExpandLevels, AppBindingLocations, AppCallTypes, AppCallResponseTypes} from '@constants/apps';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {createCallContext, createCallRequest} from '@utils/apps';
import {getStatusColors} from '@utils/message_attachment_colors';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import ButtonBindingText from './button_binding_text';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

type Props = {
    currentTeamId: string;
    binding: AppBinding;
    post: PostModel;
    teamID?: string;
    theme: Theme;
}

const {SERVER: {SYSTEM}} = MM_TABLES;

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
        buttonDisabled: {backgroundColor: changeOpacity(theme.buttonBg, 0.3)},
        text: {
            color: STATUS_COLORS.default,
            fontSize: 15,
            fontFamily: 'OpenSans-SemiBold',
            lineHeight: 17,
        },
    };
});

const ButtonBinding = ({currentTeamId, binding, post, teamID, theme}: Props) => {
    const pressed = useRef(false);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);

    const onPress = useCallback(preventDoubleTap(async () => {
        if (!binding.call || pressed.current) {
            return;
        }

        pressed.current = true;

        const context = createCallContext(
            binding.app_id,
            AppBindingLocations.IN_POST + binding.location,
            post.channelId,
            teamID || currentTeamId,
            post.id,
        );

        const call = createCallRequest(
            binding.call,
            context,
            {post: AppExpandLevels.EXPAND_ALL},
        );

        const res = await doAppCall(serverUrl, call, AppCallTypes.SUBMIT, intl, theme);
        pressed.current = false;

        if (res.error) {
            const errorResponse = res.error as AppCallResponse<unknown>;
            const errorMessage = errorResponse.error || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            postEphemeralCallResponseForPost(serverUrl, errorResponse, errorMessage, post);
            return;
        }

        const callResp = res.data!;

        switch (callResp.type) {
            case AppCallResponseTypes.OK:
                if (callResp.markdown) {
                    postEphemeralCallResponseForPost(serverUrl, callResp, callResp.markdown, post);
                }
                return;
            case AppCallResponseTypes.NAVIGATE:
            case AppCallResponseTypes.FORM:
                return;
            default: {
                const errorMessage = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResp.type,
                });
                postEphemeralCallResponseForPost(serverUrl, callResp, errorMessage, post);
            }
        }
    }), []);

    return (
        <Button
            containerStyle={[style.button]}
            disabledContainerStyle={style.buttonDisabled}
            onPress={onPress}
        >
            <ButtonBindingText
                message={binding.label}
                style={style.text}
            />
        </Button>
    );

    return null;
};

const withTeamId = withObservables(['post'], ({post}: {post: PostModel}) => ({
    teamID: post.channel.observe().pipe(map((channel: ChannelModel) => channel.teamId)),
    currentTeamId: post.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        map(({value}) => value),
    ),
}));

export default withTeamId(ButtonBinding);
