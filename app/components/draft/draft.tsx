// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import ChannelInfo from '@app/components/channel_info';
import DraftPost from '@app/components/draft/draft_post';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    location: string;
    sendToUser?: UserModel;
    draft: DraftModel;
    layoutWidth: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingHorizontal: 20,
            paddingVertical: 16,
            width: '100%',
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderTopWidth: 1,
        },
    };
});

const Draft: React.FC<Props> = ({
    channel,
    location,
    draft,
    sendToUser,
    layoutWidth,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View
            style={style.container}
        >
            <ChannelInfo
                channel={channel}
                sendToUser={sendToUser}
                rootId={draft.rootId}
                testID='draft_post.channel_info'
            />
            <DraftPost
                draft={draft}
                location={location}
                layoutWidth={layoutWidth}
            />
        </View>
    );
};

export default Draft;
