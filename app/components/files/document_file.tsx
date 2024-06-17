// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useImperativeHandle} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import ProgressBar from '@components/progress_bar';
import {useTheme} from '@context/theme';
import {useDownloadFileAndPreview} from '@hooks/files';
import {alertDownloadDocumentDisabled} from '@utils/document';

import FileIcon from './file_icon';

export type DocumentFileRef = {
    handlePreviewPress: () => void;
}

type DocumentFileProps = {
    backgroundColor?: string;
    canDownloadFiles: boolean;
    file: FileInfo;
}

const styles = StyleSheet.create({
    progress: {
        justifyContent: 'flex-end',
        height: 48,
        left: 2,
        top: 5,
        width: 44,
    },
});

const DocumentFile = forwardRef<DocumentFileRef, DocumentFileProps>(({backgroundColor, canDownloadFiles, file}: DocumentFileProps, ref) => {
    const intl = useIntl();
    const theme = useTheme();

    const {downloading, progress, toggleDownloadAndPreview} = useDownloadFileAndPreview();

    const handlePreviewPress = async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        toggleDownloadAndPreview(file);
    };

    useImperativeHandle(ref, () => ({
        handlePreviewPress,
    }), []);

    const icon = (
        <FileIcon
            backgroundColor={backgroundColor}
            file={file}
        />
    );

    let fileAttachmentComponent = icon;
    if (downloading) {
        fileAttachmentComponent = (
            <>
                {icon}
                <View style={[StyleSheet.absoluteFill, styles.progress]}>
                    <ProgressBar
                        progress={progress || 0.1}
                        color={theme.buttonBg}
                    />
                </View>
            </>
        );
    }

    return (
        <TouchableOpacity onPress={handlePreviewPress}>
            {fileAttachmentComponent}
        </TouchableOpacity>
    );
});

DocumentFile.displayName = 'DocumentFile';

export default DocumentFile;
