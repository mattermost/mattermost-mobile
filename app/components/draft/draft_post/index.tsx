// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, TouchableOpacity} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import DraftMessage from '@app/components/draft/draft_post/draft_message';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

import DraftFiles from './draft_files';

import type {DraftModel} from '@app/database/models/server';

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
    const acknowledgementsVisible = draft.metadata?.priority?.requested_ack;
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
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
                    draftId={draft.id}
                    location={location}
                    layoutWidth={layoutWidth}
                />
            }
            {
                acknowledgementsVisible &&
                <TouchableOpacity style={style.acknowledgementContainer}>
                    <CompassIcon
                        color={theme.onlineIndicator}
                        name='check-circle-outline'
                        size={24}
                    />
                </TouchableOpacity>
            }
        </View>
    );
};

export default DraftPost;
