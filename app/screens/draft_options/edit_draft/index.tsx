// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {switchToThread} from '@actions/local/thread';
import {switchToChannelById} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    channel: ChannelModel;
    rootId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
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

const EditDraft: React.FC<Props> = ({
    bottomSheetId,
    channel,
    rootId,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const editHandler = async () => {
        await dismissBottomSheet(bottomSheetId);
        if (rootId) {
            switchToThread(serverUrl, rootId, false);
            return;
        }
        switchToChannelById(serverUrl, channel.id, channel.teamId, false);
    };

    return (
        <TouchableWithFeedback
            type={'opacity'}
            style={style.draftOptions}
            onPress={editHandler}
            testID='edit_draft'
        >
            <CompassIcon
                name='pencil-outline'
                size={ICON_SIZE}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
            <FormattedText
                id='draft.options.edit.title'
                defaultMessage={'Edit draft'}
                style={style.title}
            />
        </TouchableWithFeedback>
    );
};

export default EditDraft;
