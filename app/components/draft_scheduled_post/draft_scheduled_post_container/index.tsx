// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DraftFiles from './draft_and_scheduled_post_files';
import DraftAndScheduledPostMessage from './draft_and_scheduled_post_message';

import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    post: DraftModel | ScheduledPostModel;
    location: AvailableScreens;
    layoutWidth: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 12,
        },
        acknowledgementContainer: {
            marginTop: 8,
            alignItems: 'center',
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.12),
            flexDirection: 'row',
            height: 32,
            width: 42,
            justifyContent: 'center',
            paddingHorizontal: 8,
        },
    };
});

const DraftAndScheduledPostContainer: React.FC<Props> = ({
    post,
    location,
    layoutWidth,
}) => {
    const theme = useTheme();
    const hasFiles = post.files.length > 0;
    const style = getStyleSheet(theme);

    return (
        <View
            style={style.container}
            testID='draft_post_with_message_and_file'
        >
            <DraftAndScheduledPostMessage
                layoutWidth={layoutWidth}
                location={location}
                post={post}
            />
            {
                hasFiles &&
                <DraftFiles
                    filesInfo={post.files}
                    isReplyPost={false}
                    location={location}
                    layoutWidth={layoutWidth}
                />
            }
        </View>
    );
};

export default DraftAndScheduledPostContainer;
