// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, View} from 'react-native';
import Button from 'react-native-button';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {deleteChannelBookmark} from '@actions/remote/channel_bookmark';
import CompassIcon from '@components/compass_icon';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {TITLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet, dismissBottomSheet, showModal} from '@screens/navigation';
import {isDocument} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {tryOpenURL} from '@utils/url';

import BookmarkDetails from './bookmark_details';
import BookmarkDocument from './bookmark_document';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';

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
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingLeft: 8,
    },
    flex: {flex: 1},
    imageContainer: {width: 24, height: 24, marginRight: 2},
    image: {width: 20, height: 20, top: 2},
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
    },

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
    file, galleryIdentifier, index, onPress, publicLinkEnabled,
}: Props) => {
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const {bottom} = useSafeAreaInsets();
    const styles = getStyleSheet(theme);
    const canCopyPublicLink = useMemo(() => {
        return bookmark.type === 'link' || (file?.id && publicLinkEnabled && managedConfig.copyAndPasteProtection !== 'true');
    }, [bookmark.type, file, publicLinkEnabled, managedConfig.copyAndPasteProtection]);

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

    const handleEdit = useCallback(async () => {
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
        }, options);
    }, [bookmark, theme]);

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

    const handleLongPress = useCallback(() => {
        const renderContent = () => (
            <>
                {!isTablet && (
                    <View style={styles.bottomSheetHeader}>
                        <Text style={styles.bottomSheetHeaderText}>
                            {bookmark.displayName}
                        </Text>
                    </View>
                )}
                <View style={styles.flex}>
                    {canEditBookmarks &&
                    <OptionItem
                        action={handleEdit}
                        label={intl.formatMessage({id: 'channel_bookmark.edit_option', defaultMessage: 'Edit'})}
                        icon='pencil-outline'
                        type='default'
                    />
                    }
                    {canCopyPublicLink &&
                    <OptionItem
                        action={() => null}
                        label={intl.formatMessage({id: 'channel_bookmark.copy_option', defaultMessage: 'Copy Link'})}
                        icon='content-copy'
                        type='default'
                    />
                    }
                    {canDownloadFiles &&
                    <OptionItem
                        action={() => null}
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

        const count = [canCopyPublicLink, canDeleteBookmarks, canDownloadFiles, canEditBookmarks].
            filter((e) => e).length;

        bottomSheet({
            title: bookmark.displayName,
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(1, (count * ITEM_HEIGHT), bottom) + TITLE_HEIGHT],
            theme,
            closeButtonId: 'close-channel-bookmark-actions',
        });
    }, [bookmark, bottom, canCopyPublicLink, canDeleteBookmarks, canDownloadFiles, canEditBookmarks]);

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
