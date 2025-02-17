// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {deleteDraftConfirmation} from '@utils/draft';
import {deleteScheduledPostConfirmation} from '@utils/scheduled_post';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    channelId: string;
    rootId: string;
    postType?: 'draft' | 'scheduled';
    postId?: string;
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

const DeleteDraft: React.FC<Props> = ({
    bottomSheetId,
    channelId,
    rootId,
    postType,
    postId,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const draftDeleteHandler = async () => {
        await dismissBottomSheet(bottomSheetId);
        if (postType === 'draft') {
            deleteDraftConfirmation({
                intl,
                serverUrl,
                channelId,
                rootId,
            });
        }
        if (postType === 'scheduled' && postId) {
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
            {postType === 'draft' ? (
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

export default DeleteDraft;
