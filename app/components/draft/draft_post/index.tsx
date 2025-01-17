// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import DraftMessage from '@components/draft/draft_post/draft_message';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DraftFiles from './draft_files';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    draft: DraftModel;
    location: string;
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

const DraftPost: React.FC<Props> = ({
    draft,
    location,
    layoutWidth,
}) => {
    const theme = useTheme();
    const hasFiles = draft.files.length > 0;
    const style = getStyleSheet(theme);

    return (
        <View
            style={style.container}
            testID='draft_post_with_message_and_file'
        >
            <DraftMessage
                layoutWidth={layoutWidth}
                location={location}
                draft={draft}
            />
            {
                hasFiles &&
                <DraftFiles
                    filesInfo={draft.files}
                    isReplyPost={false}
                    location={location}
                    layoutWidth={layoutWidth}
                />
            }
        </View>
    );
};

export default DraftPost;
