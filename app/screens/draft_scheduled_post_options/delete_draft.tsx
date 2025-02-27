// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import WebsocketManager from '@managers/websocket_manager';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {dismissBottomSheet} from '@screens/navigation';
import {deleteDraftConfirmation} from '@utils/draft';
import {deleteScheduledPostConfirmation} from '@utils/scheduled_post';
import {showSnackBar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    channelId: string;
    rootId: string;
    draftType?: DraftType;
    postId?: string;
    websocketState: WebsocketConnectedState;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.dndIndicator,
        ...typography('Body', 200),
    },
    draftOptions: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
}));

export const DeleteDraft: React.FC<Props> = ({
    bottomSheetId,
    channelId,
    rootId,
    draftType,
    postId,
    websocketState,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const draftDeleteHandler = async () => {
        await dismissBottomSheet(bottomSheetId);
        if (draftType === DRAFT_TYPE_DRAFT) {
            deleteDraftConfirmation({
                intl,
                serverUrl,
                channelId,
                rootId,
            });
            return;
        }
        if (websocketState !== 'connected') {
            showSnackBar({
                barType: SNACK_BAR_TYPE.CONNECTION_ERROR,
                customMessage: intl.formatMessage({id: 'server.not_connected', defaultMessage: 'Cannot reach the server'}),
                type: 'error',
                keepOpen: true,
            });
            return;
        }
        if (draftType === DRAFT_TYPE_SCHEDULED && postId) {
            deleteScheduledPostConfirmation({
                intl,
                serverUrl,
                scheduledPostId: postId,
            });
        }
    };

    return (
        <TouchableWithFeedback
            type={'opacity'}
            style={style.draftOptions}
            onPress={draftDeleteHandler}
            testID='delete_draft'
        >
            <CompassIcon
                name='trash-can-outline'
                size={ICON_SIZE}
                color={theme.dndIndicator}
            />
            {draftType === DRAFT_TYPE_DRAFT ? (
                <FormattedText
                    id='draft.options.delete.title'
                    defaultMessage={'Delete draft'}
                    style={style.title}
                />
            ) : (
                <FormattedText
                    id='scheduled_post.options.delete.title'
                    defaultMessage={'Delete'}
                    style={style.title}
                />
            )}
        </TouchableWithFeedback>
    );
};

const enhanced = withObservables([], () => {
    const serverUrl = useServerUrl();
    return {
        websocketState: WebsocketManager.observeWebsocketState(serverUrl),
    };
});

export default enhanced(DeleteDraft);
