// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';
import Button from 'react-native-button';

import {useTheme} from '@context/theme';
import {useGalleryItem} from '@hooks/gallery';
import {isDocument} from '@utils/file';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {tryOpenURL} from '@utils/url';

import BookmarkDetails from './bookmark_details';
import BookmarkDocument from './bookmark_document';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';

type Props = {
    bookmark: ChannelBookmarkModel;
    canDownloadFiles: boolean;
    file?: FileModel;
    galleryIdentifier: string;
    index?: number;
    onPress?: (index: number) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingLeft: 8,
    },
    imageContainer: {width: 24, height: 24, marginRight: 2},
    image: {width: 20, height: 20, top: 2},
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const ChannelBookmark = ({bookmark, canDownloadFiles, file, galleryIdentifier, index, onPress}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const onLinkError = () => {
        Alert.alert(
            intl.formatMessage({
                id: 'mobile.link.error.title',
                defaultMessage: 'Error',
            }),
            intl.formatMessage({
                id: 'mobile.link.error.text',
                defaultMessage: 'Unable to open the link.',
            }),
        );
    };

    const handlePress = useCallback(() => {
        if (bookmark.linkUrl) {
            tryOpenURL(bookmark.linkUrl, onLinkError);
        }

        onPress?.(index || 0);
    }, [bookmark, index]);

    const handleLongPress = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('LONG PRESS');
    }, []);

    const {onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index || 0, handlePress);
    const isDocumentFile = useMemo(() => isDocument(file), [file]);

    if (isDocumentFile) {
        return (
            <BookmarkDocument
                bookmark={bookmark}
                canDownloadFiles={canDownloadFiles}
                file={file!}
                onLongPress={handleLongPress}
            />
        );
    }

    return (
        <Button
            containerStyle={styles.container}
            onPress={onGestureEvent}
            onLongPress={handleLongPress}
            ref={ref}
        >
            <BookmarkDetails
                bookmark={bookmark}
                file={file}
            />
        </Button>
    );
};

export default ChannelBookmark;
