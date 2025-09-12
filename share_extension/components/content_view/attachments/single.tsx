// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {LayoutAnimation, View, StyleSheet} from 'react-native';

import RemoveButton from '@components/upload_item_shared/remove_button';
import {MAX_RESOLUTION} from '@constants/image';
import {removeShareExtensionFile} from '@share/state';
import {toFileInfo} from '@share/utils';
import {isImage, isVideo} from '@utils/file';

import SharedUploadItem from './shared_upload_item';

import type {SharedItem} from '@mattermost/rnshare';

type Props = {
    file: SharedItem;
    maxFileSize: number;
    isSmall?: boolean;
};

const layoutAnimConfig = {
    duration: 300,
    update: {
        type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
        duration: 100,
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    smallContainer: {
        marginBottom: 8,
    },
});

const Single = ({file, isSmall, maxFileSize}: Props) => {
    const fileInfo = useMemo(() => toFileInfo(file), [file]);
    const type = useMemo(() => {
        if (isImage(fileInfo)) {
            return 'image';
        }
        if (isVideo(fileInfo)) {
            return 'video';
        }
        return undefined;
    }, [fileInfo]);

    const hasError = useMemo(() => {
        const size = file.size || 0;
        if (size > maxFileSize) {
            return true;
        }

        if (type === 'image' && file.height && file.width) {
            return (file.width * file.height) > MAX_RESOLUTION;
        }

        return false;
    }, [file, maxFileSize, type]);

    const onPress = useCallback(() => {
        LayoutAnimation.configureNext(layoutAnimConfig);
        removeShareExtensionFile(file);
    }, [file]);

    if (isSmall) {
        return (
            <View
                style={[styles.container, styles.smallContainer]}
                testID='single-file-container'
            >
                <SharedUploadItem
                    file={file}
                    fullWidth={false}
                    hasError={hasError}
                />
                <RemoveButton
                    onPress={onPress}
                />
            </View>
        );
    }

    return (
        <View testID='single-file-container'>
            <SharedUploadItem
                file={file}
                fullWidth={true}
                hasError={hasError}
            />
        </View>
    );
};

export default Single;
