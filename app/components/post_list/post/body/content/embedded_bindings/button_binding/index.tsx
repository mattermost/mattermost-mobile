// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useRef} from 'react';
import {useIntl} from 'react-intl';
import Button from 'react-native-button';
import {map} from 'rxjs/operators';

import {handleBindingClick, postEphemeralCallResponseForPost} from '@actions/remote/apps';
import {handleGotoLocation} from '@actions/remote/command';
import {AppBindingLocations, AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';
import {showAppForm} from '@screens/navigation';
import {createCallContext} from '@utils/apps';
import {getStatusColors} from '@utils/message_attachment_colors';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import ButtonBindingText from './button_binding_text';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    currentTeamId: string;
    binding: AppBinding;
    post: PostModel;
    teamID?: string;
    theme: Theme;
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
        if (pressed.current) {
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

        const res = await handleBindingClick(serverUrl, binding, context, intl);
        pressed.current = false;

        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            postEphemeralCallResponseForPost(serverUrl, errorResponse, errorMessage, post);
            return;
        }

        const callResp = res.data!;

        switch (callResp.type) {
            case AppCallResponseTypes.OK:
                if (callResp.text) {
                    postEphemeralCallResponseForPost(serverUrl, callResp, callResp.text, post);
                }
                return;
            case AppCallResponseTypes.NAVIGATE:
                if (callResp.navigate_to_url) {
                    handleGotoLocation(serverUrl, intl, callResp.navigate_to_url);
                }
                return;
            case AppCallResponseTypes.FORM:
                if (callResp.form) {
                    showAppForm(callResp.form, context);
                }
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
            containerStyle={style.button}
            disabledContainerStyle={style.buttonDisabled}
            onPress={onPress}
        >
            <ButtonBindingText
                message={binding.label}
                style={style.text}
            />
        </Button>
    );
};

const withTeamId = withObservables(['post'], ({post, database}: {post: PostModel} & WithDatabaseArgs) => ({
    teamID: observeChannel(database, post.channelId).pipe(map((channel) => channel?.teamId)),
    currentTeamId: observeCurrentTeamId(database),
}));

export default withDatabase(withTeamId(ButtonBinding));
