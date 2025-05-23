// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, View} from 'react-native';
import Share from 'react-native-share';

import {deleteChannelBookmark} from '@actions/remote/channel_bookmark';
import {fetchPublicLink} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {dismissBottomSheet, showModal, showOverlay} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {isImage, isVideo} from '@utils/file';
import {showSnackBar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';
import type {GalleryAction, GalleryFileType, GalleryItemType} from '@typings/screens/gallery';

type Props = {
    bookmark: ChannelBookmarkModel;
    canCopyPublicLink: boolean;
    canDeleteBookmarks: boolean;
    canDownloadFiles: boolean;
    canEditBookmarks: boolean;
    enableSecureFilePreview: boolean;
    file?: FileModel;
    setAction: React.Dispatch<React.SetStateAction<GalleryAction>>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {flex: 1},
    header: {
        marginBottom: 12,
    },
    headerText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

const ChannelBookmarkOptions = ({
    bookmark,
    canCopyPublicLink,
    canDeleteBookmarks,
    canDownloadFiles,
    canEditBookmarks,
    enableSecureFilePreview,
    file,
    setAction,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const canShare = canDownloadFiles || bookmark.type === 'link';

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
    }, [bookmark.ownerId, file, isImageFile, isVideoFile]);

    const handleDelete = useCallback(async () => {
        const {error} = await deleteChannelBookmark(serverUrl, bookmark.channelId, bookmark.id);
        if (error) {
            Alert.alert(
                intl.formatMessage({id: 'channel_bookmark.delete.failed_title', defaultMessage: 'Error deleting bookmark'}),
                intl.formatMessage({id: 'channel_bookmark.delete.failed_detail', defaultMessage: 'Details: {error}'}, {
                    error: getFullErrorMessage(error),
                }),
            );
            return;
        }

        await dismissBottomSheet();
    }, [bookmark, intl, serverUrl]);

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
    }, [bookmark.displayName, handleDelete, intl]);

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

        showModal(Screens.CHANNEL_BOOKMARK, title, {
            bookmark: bookmark.toApi(),
            canDeleteBookmarks,
            channelId: bookmark.channelId,
            closeButtonId,
            file: file?.toFileInfo(bookmark.ownerId),
            ownerId: bookmark.ownerId,
            type: bookmark.type,
        }, options);
    }, [bookmark, canDeleteBookmarks, file, intl, theme]);

    const onShare = useCallback(async () => {
        await dismissBottomSheet();

        if (bookmark.type === 'file') {
            if (file) {
                setAction('sharing');
                showOverlay(Screens.GENERIC_OVERLAY, {
                    children: (
                        <DownloadWithAction
                            action={'sharing'}
                            enableSecureFilePreview={enableSecureFilePreview}
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
    }, [bookmark.displayName, bookmark.id, bookmark.linkUrl, bookmark.type, enableSecureFilePreview, file, galleryItem, setAction]);

    return (
        <>
            {!isTablet && (
                <View style={styles.header}>
                    <Text
                        style={styles.headerText}
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
                {!enableSecureFilePreview && canCopyPublicLink &&
                    <OptionItem
                        action={onCopy}
                        label={intl.formatMessage({id: 'channel_bookmark.copy_option', defaultMessage: 'Copy Link'})}
                        icon='content-copy'
                        type='default'
                    />
                }
                {!enableSecureFilePreview && canShare &&
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
};

export default ChannelBookmarkOptions;
