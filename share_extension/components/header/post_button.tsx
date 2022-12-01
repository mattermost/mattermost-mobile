// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useShareExtensionState} from '@share/state';
import {changeOpacity} from '@utils/theme';

type Props = {
    theme: Theme;
}

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};

const styles = StyleSheet.create({
    right: {
        marginRight: 10,
    },
});

const PostButton = ({theme}: Props) => {
    const {
        closeExtension, channelId, files, globalError,
        linkPreviewUrl, message, serverUrl, userId,
    } = useShareExtensionState();

    const disabled = !serverUrl || !channelId || (!message && !files.length && !linkPreviewUrl) || globalError;

    const onPress = useCallback(() => {
        if (!serverUrl || !channelId || !userId) {
            return;
        }

        let text = message || '';
        if (linkPreviewUrl) {
            if (text) {
                text = `${text}\n\n${linkPreviewUrl}`;
            } else {
                text = linkPreviewUrl;
            }
        }

        closeExtension({
            serverUrl,
            channelId,
            files,
            message: text,
            userId,
        });
    }, [serverUrl, channelId, message, files, linkPreviewUrl, userId]);

    return (
        <TouchableOpacity
            disabled={disabled}
            onPress={onPress}
            hitSlop={hitSlop}
        >
            <View style={[styles.right]}>
                <CompassIcon
                    name='send'
                    color={changeOpacity(theme.sidebarHeaderTextColor, disabled ? 0.16 : 1)}
                    size={24}
                />
            </View>
        </TouchableOpacity>
    );
};

export default PostButton;
