// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import Document, {type DocumentRef} from '@components/document';
import ProgressBar from '@components/progress_bar';
import {useTheme} from '@context/theme';
import {useDownloadFileAndPreview} from '@hooks/files';

import FileIcon from './file_icon';

export type DocumentFileRef = {
    handlePreviewPress: () => void;
}

type DocumentFileProps = {
    backgroundColor?: string;
    disabled?: boolean;
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
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

const DocumentFile = forwardRef<DocumentRef, DocumentFileProps>(({backgroundColor, canDownloadFiles, disabled = false, enableSecureFilePreview, file}: DocumentFileProps, ref) => {
    const theme = useTheme();
    const document = useRef<DocumentRef>(null);
    const {downloading, progress, toggleDownloadAndPreview} = useDownloadFileAndPreview(enableSecureFilePreview);

    const handlePreviewPress = async () => {
        document.current?.handlePreviewPress();
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
                        progress={progress}
                        color={theme.buttonBg}
                    />
                </View>
            </>
        );
    }

    return (
        <Document
            canDownloadFiles={canDownloadFiles}
            enableSecureFilePreview={enableSecureFilePreview}
            file={file}
            downloadAndPreviewFile={toggleDownloadAndPreview}
            ref={document}
        >
            <TouchableOpacity
                disabled={disabled}
                onPress={handlePreviewPress}
            >
                {fileAttachmentComponent}
            </TouchableOpacity>
        </Document>
    );
});

DocumentFile.displayName = 'DocumentFile';

export default DocumentFile;
