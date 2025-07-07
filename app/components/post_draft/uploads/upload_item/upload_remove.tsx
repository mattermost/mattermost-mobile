// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Platform} from 'react-native';

import {removeDraftFile} from '@actions/local/draft';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useEditPost} from '@context/edit_post';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

type Props = {
    channelId: string;
    rootId: string;
    clientId: string;
    fileId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        tappableContainer: {
            position: 'absolute',
            elevation: 11,
            top: -12,
            right: -10,
            width: 24,
            height: 24,
        },
        removeButton: {
            borderRadius: 12,
            alignSelf: 'center',
            marginTop: Platform.select({
                ios: 5.4,
                android: 4.75,
            }),
            backgroundColor: theme.centerChannelBg,
            width: 24,
            height: 25,
        },
    };
});

export default function UploadRemove({
    channelId,
    rootId,
    clientId,
    fileId,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const {onFileRemove, isEditMode} = useEditPost();

    const onPress = useCallback(() => {
        if (isEditMode) {
            onFileRemove?.(fileId || clientId);
            return;
        }
        DraftEditPostUploadManager.cancel(clientId);
        removeDraftFile(serverUrl, channelId, rootId, clientId);
    }, [onFileRemove, isEditMode, fileId, clientId, serverUrl, channelId, rootId]);

    return (
        <TouchableWithFeedback
            style={style.tappableContainer}
            onPress={onPress}
            type={'opacity'}
            testID={`remove-button-${fileId}`}
        >
            <View style={style.removeButton}>
                <CompassIcon
                    name='close-circle'
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    size={24}
                />
            </View>
        </TouchableWithFeedback>
    );
}
