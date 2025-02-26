// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {ICON_SIZE} from '@constants/post_draft';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {withServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import websocket_manager from '@managers/websocket_manager';
import {dismissBottomSheet, showModal} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    draft: ScheduledPostModel;
    websocketState: WebsocketConnectedState;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    rescheduledContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
}));

export const RescheduledDraft: React.FC<Props> = ({
    bottomSheetId,
    draft,
    websocketState,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const rescheduledDraft = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        if (websocketState !== 'connected') {
            showSnackBar({
                barType: SNACK_BAR_TYPE.CONNECTION_ERROR,
                customMessage: intl.formatMessage({id: 'network_connection.not_connected', defaultMessage: 'No internet connection'}),
                type: 'error',
                keepOpen: true,
            });
            return;
        }
        const title = intl.formatMessage({id: 'mobile.reschedule_draft.title', defaultMessage: 'Change Schedule'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-rescheduled-draft';
        const passProps = {closeButtonId, draft};
        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    testID: 'close.reschedule_draft.button',
                    icon: closeButton,
                }],
            },
        };
        showModal(Screens.RESCHEDULE_DRAFT, title, passProps, options);
    }, [bottomSheetId, draft, intl, theme.sidebarHeaderTextColor, websocketState]);

    return (
        <TouchableWithFeedback
            type={'opacity'}
            style={style.rescheduledContainer}
            onPress={rescheduledDraft}
            testID='rescheduled_draft'
        >
            <CompassIcon
                name='clock-send-outline'
                size={ICON_SIZE}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
            <FormattedText
                id='draft.options.reschedule.title'
                defaultMessage={'Reschedule'}
                style={style.title}
            />
        </TouchableWithFeedback>
    );
};

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    websocketState: websocket_manager.observeWebsocketState(serverUrl),
}));

export default withServerUrl(enhanced(RescheduledDraft));
