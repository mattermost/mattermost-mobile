// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';

import PhotoAttachment from '@app/components/post_draft/quick_actions/camera_quick_action/photo_attacment';
import VideoAttachment from '@app/components/post_draft/quick_actions/camera_quick_action/video_attacment';
import FileQuickAction from '@app/components/post_draft/quick_actions/file_quick_action';
import ImageQuickAction from '@app/components/post_draft/quick_actions/image_quick_action';
import {typography} from '@app/utils/typography';

import type {AttachmentOptionsProps} from '@app/components/post_draft/quick_actions/attachment_options/attachment_options.types';

const styles = StyleSheet.create({
    header: {
        ...typography('Heading', 600, 'SemiBold'),
        display: 'flex',
        paddingBottom: 4,
    },
});

const AttachmentOptionContainer: React.FC<AttachmentOptionsProps> = ({
    testID,
    canUploadFiles,
    fileCount,
    maxFileCount,
    onUploadFiles,
    maxFilesReached,
}) => {
    const uploadProps = {
        disabled: !canUploadFiles,
        fileCount,
        maxFileCount,
        maxFilesReached,
        onUploadFiles,
    };

    const fileActionTestID = `${testID}.file_action`;
    const imageActionTestID = `${testID}.image_action`;
    const cameraActionTestID = `${testID}.camera_action`;

    const {formatMessage} = useIntl();
    return (
        <View>
            <Text style={styles.header}>{formatMessage(
                {id: 'attachment_option.header', defaultMessage: 'Files and media'},
            )}</Text>
            <View>
                <ImageQuickAction
                    testID={imageActionTestID}
                    {...uploadProps}
                />
                <PhotoAttachment
                    testID={cameraActionTestID}
                    {...uploadProps}
                />
                <VideoAttachment
                    testID={cameraActionTestID}
                    {...uploadProps}
                />
                <FileQuickAction
                    testID={fileActionTestID}
                    {...uploadProps}
                />
            </View>
        </View>
    );
};

export default AttachmentOptionContainer;
