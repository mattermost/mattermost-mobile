// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';

import {ITEM_HEIGHT} from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useGalleryItem} from '@hooks/gallery';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet} from '@screens/navigation';
import {isDocument} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {openLink} from '@utils/url/links';

import BookmarkDetails from './bookmark_details';
import BookmarkDocument from './bookmark_document';
import ChannelBookmarkOptions from './bookmark_options';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';

type Props = {
    bookmark: ChannelBookmarkModel;
    canDeleteBookmarks: boolean;
    canDownloadFiles: boolean;
    canEditBookmarks: boolean;
    enableSecureFilePreview: boolean;
    file?: FileModel;
    galleryIdentifier: string;
    index?: number;
    onPress?: (index: number) => void;
    publicLinkEnabled: boolean;
    siteURL: string;
}

const styles = StyleSheet.create({
    pressable: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 6,
        height: 48,
        paddingHorizontal: 0,
    },
});

const ChannelBookmark = ({
    bookmark, canDeleteBookmarks, canDownloadFiles, canEditBookmarks, enableSecureFilePreview,
    file, galleryIdentifier, index, onPress, publicLinkEnabled, siteURL,
}: Props) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const isDocumentFile = useMemo(() => isDocument(file), [file]);
    const canCopyPublicLink = !enableSecureFilePreview && Boolean((bookmark.type === 'link' || (file?.id && publicLinkEnabled)) && managedConfig.copyAndPasteProtection !== 'true');

    const handlePress = useCallback(() => {
        if (bookmark.linkUrl) {
            openLink(bookmark.linkUrl, serverUrl, siteURL, intl);
            return;
        }

        onPress?.(index || 0);
    }, [bookmark.linkUrl, index, intl, onPress, serverUrl, siteURL]);

    const handleLongPress = useCallback(() => {
        const canShare = !enableSecureFilePreview && (canDownloadFiles || bookmark.type === 'link');
        const count = [canCopyPublicLink, canDeleteBookmarks, canShare, canEditBookmarks].
            filter((e) => e).length;

        const renderContent = () => (
            <ChannelBookmarkOptions
                bookmark={bookmark}
                canCopyPublicLink={canCopyPublicLink}
                canDeleteBookmarks={canDeleteBookmarks}
                canDownloadFiles={!enableSecureFilePreview && canDownloadFiles}
                canEditBookmarks={canEditBookmarks}
                enableSecureFilePreview={enableSecureFilePreview}
                file={file}
            />
        );

        const snapPoints = [1, bottomSheetSnapPoint(count, ITEM_HEIGHT) + TITLE_HEIGHT];
        bottomSheet(renderContent, snapPoints);
    }, [bookmark, canCopyPublicLink, canDeleteBookmarks, canDownloadFiles, canEditBookmarks, enableSecureFilePreview, file]);

    const {onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index || 0, handlePress);

    if (isDocumentFile) {
        return (
            <BookmarkDocument
                bookmark={bookmark}
                canDownloadFiles={canDownloadFiles}
                enableSecureFilePreview={enableSecureFilePreview}
                file={file!}
                onLongPress={handleLongPress}
            />
        );
    }

    return (
        <Animated.View
            ref={ref}
            testID={`channel_bookmark.${bookmark.id}`}
        >
            <Pressable
                style={({pressed}) => [styles.pressable, pressed && {opacity: 0.72}]}
                onPress={onGestureEvent}
                onLongPress={handleLongPress}
            >
                <BookmarkDetails
                    bookmark={bookmark}
                    file={file}
                />
            </Pressable>
        </Animated.View>
    );
};

export default ChannelBookmark;
