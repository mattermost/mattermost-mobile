// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Button from 'react-native-button';

import ProgressBar from '@app/components/progress_bar';
import {useTheme} from '@app/context/theme';
import Document, {type DocumentRef} from '@components/document';

import BookmarkDetails from './bookmark_details';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';

type Props = {
    bookmark: ChannelBookmarkModel;
    canDownloadFiles: boolean;
    file: FileModel;
    onLongPress: () => void;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingVertical: 6,
    },
    progress: {
        justifyContent: 'flex-end',
    },
});

const BookmarkDocument = ({bookmark, canDownloadFiles, file, onLongPress}: Props) => {
    const [progress, setProgress] = useState(0);
    const document = useRef<DocumentRef>(null);
    const theme = useTheme();

    const handlePress = useCallback(async () => {
        if (document.current) {
            document.current.handlePreviewPress();
        }
    }, []);

    return (
        <Document
            canDownloadFiles={canDownloadFiles}
            file={file.toFileInfo(bookmark.ownerId)}
            onProgress={setProgress}
            ref={document}
        >
            <Button
                onPress={handlePress}
                onLongPress={onLongPress}
                containerStyle={styles.container}
            >
                <BookmarkDetails
                    bookmark={bookmark}
                    file={file}
                >
                    <View style={[StyleSheet.absoluteFill, styles.progress]}>
                        {progress > 0 &&
                        <ProgressBar
                            progress={progress}
                            color={theme.buttonBg}
                        />
                        }
                    </View>
                </BookmarkDetails>
            </Button>
        </Document>
    );
};

export default BookmarkDocument;
