// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, View} from 'react-native';
import Button from 'react-native-button';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Share from 'react-native-share';

import {deleteChannelBookmark} from '@actions/remote/channel_bookmark';
import {fetchPublicLink} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {bottomSheet, dismissBottomSheet, dismissOverlay, showModal, showOverlay} from '@screens/navigation';
import {handleDeepLink, matchDeepLink} from '@utils/deep_link';
import {isDocument, isImage, isVideo} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {showSnackBar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {normalizeProtocol, tryOpenURL} from '@utils/url';

import BookmarkDetails from './bookmark_details';
import BookmarkDocument from './bookmark_document';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';
import type {GalleryAction, GalleryFileType, GalleryItemType} from '@typings/screens/gallery';

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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingLeft: 8,
    },
    flex: {flex: 1},
    bottomSheetHeader: {
        marginBottom: 12,
    },
    bottomSheetHeaderText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

const ChannelBookmark = ({
    bookmark, canDeleteBookmarks, canDownloadFiles, canEditBookmarks,
    file, galleryIdentifier, index, onPress, publicLinkEnabled, siteURL,
}: Props) => {
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const {bottom} = useSafeAreaInsets();
    const [action, setAction] = useState<GalleryAction>('none');
    const styles = getStyleSheet(theme);
    const canCopyPublicLink = useMemo(() => {
        return (bookmark.type === 'link' || (file?.id && publicLinkEnabled)) && managedConfig.copyAndPasteProtection !== 'true';
    }, [bookmark.type, file, publicLinkEnabled, managedConfig.copyAndPasteProtection]);
    const isDocumentFile = useMemo(() => isDocument(file), [file]);
    const isVideoFile = useMemo(() => isVideo(file), [file]);
    const isImageFile = useMemo(() => isImage(file), [file]);

    const galleryItem = useMemo(() => {
        if (file) {
            const fileInfo = file.toFileInfo(bookmark.ownerId);
            let type: GalleryFileType = 'file';
            if (isImageFile) {
                type = 'image';
            } else if (isVideoFile) {
                type = 'video';
            }
            const item: GalleryItemType = {
                ...fileInfo,
                id: fileInfo.id!,
                type,
                lastPictureUpdate: 0,
                uri: '',
            };

            return item;
        }
        return null;
    }, [bookmark, file]);

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

    const openLink = async (href: string) => {
        const url = normalizeProtocol(href);
        if (!url) {
            return;
        }

        const match = matchDeepLink(url, serverUrl, siteURL);

        if (match) {
            const {error} = await handleDeepLink(match.url, intl);
            if (error) {
                tryOpenURL(match.url, onLinkError);
            }
        } else {
            tryOpenURL(url, onLinkError);
        }
    };

    const handlePress = useCallback(() => {
        if (bookmark.linkUrl) {
            openLink(bookmark.linkUrl);
            return;
        }

        onPress?.(index || 0);
    }, [bookmark, index]);

    const onEdit = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'screens.channel_bookmark_edit', defaultMessage: 'Edit bookmark'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-channel_bookmark_edit';

        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.channel_bookmark_edit.button',
                }],
            },
        };

        showModal(Screens.CHANNEL_BOOKMARK_EDIT, title, {
            bookmark: bookmark.toApi(),
            closeButtonId,
            file: file?.toFileInfo(bookmark.ownerId),
            canDeleteBookmarks,
        }, options);
    }, [bookmark, file, canDeleteBookmarks, theme]);

    const handleDelete = useCallback(async () => {
        const res = await deleteChannelBookmark(serverUrl, bookmark.channelId, bookmark.id);
        if (res.error) {
            Alert.alert(
                intl.formatMessage({id: 'channel_bookmark.delete.failed_title', defaultMessage: 'Error deleting bookmark'}),
                `Details:\n${res.error}`,
            );
            return;
        }

        await dismissBottomSheet();
    }, [bookmark, serverUrl]);

    const onDelete = useCallback(async () => {
        Alert.alert(
            intl.formatMessage({id: 'channel_bookmark.delete.confirm_title', defaultMessage: 'Delete bookmark'}),
            intl.formatMessage({id: 'channel_bookmark.delete.confirm', defaultMessage: 'You sure want to delete the bookmark {displayName}?'}, {
                displayName: bookmark.displayName,
            }),
            [{
                text: intl.formatMessage({id: 'channel_bookmark.delete.yes', defaultMessage: 'Yes'}),
                style: 'destructive',
                isPreferred: true,
                onPress: handleDelete,
            }, {
                text: intl.formatMessage({id: 'channel_bookmark.add.file_cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }],
        );
    }, [bookmark, handleDelete]);

    const onCopy = useCallback(async () => {
        await dismissBottomSheet();

        if (bookmark.type === 'link' && bookmark.linkUrl) {
            Clipboard.setString(bookmark.linkUrl);
            showSnackBar({barType: 'LINK_COPIED'});
            return;
        }

        try {
            const publicLink = await fetchPublicLink(serverUrl, bookmark.fileId!);
            if ('link' in publicLink) {
                Clipboard.setString(publicLink.link);
                showSnackBar({barType: 'LINK_COPIED'});
            } else {
                showSnackBar({barType: 'LINK_COPY_FAILED'});
            }
        } catch {
            showSnackBar({barType: 'LINK_COPY_FAILED'});
        }
    }, [bookmark, serverUrl]);

    const onShare = useCallback(async () => {
        await dismissBottomSheet();

        if (bookmark.type === 'file') {
            if (file) {
                setAction('sharing');
                showOverlay(Screens.GENERIC_OVERLAY, {
                    children: (
                        <DownloadWithAction
                            action={'sharing'}
                            galleryView={false}
                            item={galleryItem!}
                            setAction={setAction}
                        />
                    ),
                }, {}, bookmark.id);
            }
            return;
        }

        if (bookmark.type === 'link') {
            const title = bookmark.displayName;
            const url = bookmark.linkUrl!;
            Share.open({
                title,
                message: title,
                url,
                showAppsToView: true,
            }).catch(() => {
                // do nothing
            });
        }
    }, [bookmark, file, serverUrl]);

    const handleLongPress = useCallback(() => {
        const canShare = canDownloadFiles || bookmark.type === 'link';
        const count = [canCopyPublicLink, canDeleteBookmarks, canShare, canEditBookmarks].
            filter((e) => e).length;

        const renderContent = () => (
            <>
                {!isTablet && (
                    <View style={styles.bottomSheetHeader}>
                        <Text
                            style={styles.bottomSheetHeaderText}
                            numberOfLines={1}
                        >
                            {bookmark.displayName}
                        </Text>
                    </View>
                )}
                <View style={styles.flex}>
                    {canEditBookmarks &&
                    <OptionItem
                        action={onEdit}
                        label={intl.formatMessage({id: 'channel_bookmark.edit_option', defaultMessage: 'Edit'})}
                        icon='pencil-outline'
                        type='default'
                    />
                    }
                    {canCopyPublicLink &&
                    <OptionItem
                        action={onCopy}
                        label={intl.formatMessage({id: 'channel_bookmark.copy_option', defaultMessage: 'Copy Link'})}
                        icon='content-copy'
                        type='default'
                    />
                    }
                    {canShare &&
                    <OptionItem
                        action={onShare}
                        label={intl.formatMessage({id: 'channel_bookmark.share_option', defaultMessage: 'Share'})}
                        icon='share-variant-outline'
                        type='default'
                    />
                    }
                    {canDeleteBookmarks &&
                    <OptionItem
                        action={onDelete}
                        destructive={true}
                        label={intl.formatMessage({id: 'channel_bookmark.delete_option', defaultMessage: 'Delete'})}
                        icon='trash-can-outline'
                        type='default'
                    />
                    }
                </View>
            </>
        );

        bottomSheet({
            title: bookmark.displayName,
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(1, (count * ITEM_HEIGHT), bottom) + TITLE_HEIGHT],
            theme,
            closeButtonId: 'close-channel-bookmark-actions',
        });
    }, [bookmark, bottom, canCopyPublicLink, canDeleteBookmarks, canDownloadFiles, canEditBookmarks]);

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
