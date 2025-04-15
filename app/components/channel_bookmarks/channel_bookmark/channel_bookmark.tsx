// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {Button} from '@rneui/base';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl, type IntlShape} from 'react-intl';
import {Alert, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';

import {ITEM_HEIGHT} from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useGalleryItem} from '@hooks/gallery';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet, dismissOverlay} from '@screens/navigation';
import {handleDeepLink, matchDeepLink} from '@utils/deep_link';
import {isDocument} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {normalizeProtocol, tryOpenURL} from '@utils/url';

import BookmarkDetails from './bookmark_details';
import BookmarkDocument from './bookmark_document';
import ChannelBookmarkOptions from './bookmark_options';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';
import type {GalleryAction} from '@typings/screens/gallery';

type Props = {
    bookmark: ChannelBookmarkModel;
    canDeleteBookmarks: boolean;
    canDownloadFiles: boolean;
    canEditBookmarks: boolean;
    file?: FileModel;
    galleryIdentifier: string;
    index?: number;
    onPress?: (index: number) => void;
    publicLinkEnabled: boolean;
    siteURL: string;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 6,
        height: 48,
    },
    button: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
    },
});

const openLink = async (href: string, serverUrl: string, siteURL: string, intl: IntlShape) => {
    const url = normalizeProtocol(href);
    if (!url) {
        return;
    }

    const match = matchDeepLink(url, serverUrl, siteURL);

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

    if (match) {
        const {error} = await handleDeepLink(match.url, intl);
        if (error) {
            tryOpenURL(match.url, onLinkError);
        }
    } else {
        tryOpenURL(url, onLinkError);
    }
};

const ChannelBookmark = ({
    bookmark, canDeleteBookmarks, canDownloadFiles, canEditBookmarks,
    file, galleryIdentifier, index, onPress, publicLinkEnabled, siteURL,
}: Props) => {
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const [action, setAction] = useState<GalleryAction>('none');
    const isDocumentFile = useMemo(() => isDocument(file), [file]);
    const canCopyPublicLink = Boolean((bookmark.type === 'link' || (file?.id && publicLinkEnabled)) && managedConfig.copyAndPasteProtection !== 'true');

    const handlePress = useCallback(() => {
        if (bookmark.linkUrl) {
            openLink(bookmark.linkUrl, siteURL, serverUrl, intl);
            return;
        }

        onPress?.(index || 0);
    }, [bookmark, index, intl, onPress, serverUrl, siteURL]);

    const handleLongPress = useCallback(() => {
        const canShare = canDownloadFiles || bookmark.type === 'link';
        const count = [canCopyPublicLink, canDeleteBookmarks, canShare, canEditBookmarks].
            filter((e) => e).length;

        const renderContent = () => (
            <ChannelBookmarkOptions
                bookmark={bookmark}
                canCopyPublicLink={canCopyPublicLink}
                canDeleteBookmarks={canDeleteBookmarks}
                canDownloadFiles={canDownloadFiles}
                canEditBookmarks={canEditBookmarks}
                file={file}
                setAction={setAction}
            />
        );

        bottomSheet({
            title: bookmark.displayName,
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(1, (count * ITEM_HEIGHT)) + TITLE_HEIGHT],
            theme,
            closeButtonId: 'close-channel-bookmark-actions',
        });
    }, [bookmark, canCopyPublicLink, canDeleteBookmarks, canDownloadFiles, canEditBookmarks, file, theme]);

    const {onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index || 0, handlePress);

    useEffect(() => {
        if (action === 'none' && bookmark.id) {
            dismissOverlay(bookmark.id);
        }
    }, [action]);

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
        <Animated.View ref={ref}>
            <Button
                containerStyle={styles.container}
                buttonStyle={styles.button}
                onPress={onGestureEvent}
                onLongPress={handleLongPress}
            >
                <BookmarkDetails
                    bookmark={bookmark}
                    file={file}
                />
            </Button>
        </Animated.View>
    );
};

export default ChannelBookmark;
