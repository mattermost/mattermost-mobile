// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View, type AlertButton} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {addRecentReaction} from '@actions/local/reactions';
import {createChannelBookmark, deleteChannelBookmark, editChannelBookmark} from '@actions/remote/channel_bookmark';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BookmarkDetail from './components/bookmark_detail';
import AddBookmarkFile from './components/bookmark_file';
import BookmarkLink from './components/bookmark_link';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bookmark?: ChannelBookmark;
    canDeleteBookmarks?: boolean;
    channelId: string;
    closeButtonId: string;
    componentId: AvailableScreens;
    file?: FileInfo;
    ownerId: string;
    type: ChannelBookmarkType;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    progress: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 4,
        paddingLeft: 3,
        marginTop: 12,
    },
    deleteBg: {backgroundColor: changeOpacity(theme.errorTextColor, 0.16)},
    deleteContainer: {paddingTop: 32},
    deleteText: {color: theme.errorTextColor},
}));

const RIGHT_BUTTON = buildNavigationButton('edit-bookmark', 'channel_bookmark.edit.save_button');
const edges: Edge[] = ['bottom', 'left', 'right'];
const emptyBookmark: ChannelBookmark = {
    id: '',
    create_at: 0,
    update_at: 0,
    delete_at: 0,
    channel_id: '',
    owner_id: '',
    display_name: '',
    sort_order: 0,
    type: 'link',
};

const ChannelBookmarkAddOrEdit = ({
    bookmark: original,
    canDeleteBookmarks = false,
    channelId,
    closeButtonId,
    componentId,
    file: originalFile,
    ownerId,
    type,
}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const [bookmark, setBookmark] = useState<ChannelBookmark|undefined>(original);
    const [file, setFile] = useState<ExtractedFileInfo|undefined>(originalFile);
    const [isSaving, setIsSaving] = useState(false);

    const enableSaveButton = useCallback((enabled: boolean) => {
        setButtons(componentId, {
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                text: formatMessage({id: 'channel_bookmark.edit.save_button', defaultMessage: 'Save'}),
                enabled,
            }],
        });
    }, [componentId, formatMessage, theme.sidebarHeaderTextColor]);

    const setBookmarkToSave = useCallback((b?: ChannelBookmark) => {
        enableSaveButton((b?.type === 'link' && Boolean(b?.link_url)) || (b?.type === 'file' && Boolean(b.file_id)));
        setBookmark(b);
    }, [enableSaveButton]);

    const handleError = useCallback((error: string, buttons?: AlertButton[]) => {
        const title = original ? formatMessage({id: 'channel_bookmark.edit.failed_title', defaultMessage: 'Error editing bookmark'}) : formatMessage({id: 'channel_bookmark.add.failed_title', defaultMessage: 'Error adding bookmark'});
        Alert.alert(
            title,
            formatMessage({
                id: 'channel_bookmark.add_edit.failed_desc',
                defaultMessage: 'Details: {error}',
            }, {error}),
            buttons,
        );
        setIsSaving(false);
        const enabled = Boolean(bookmark?.display_name &&
            ((bookmark?.type === 'link' && Boolean(bookmark?.link_url)) || (bookmark?.type === 'file' && Boolean(bookmark.file_id))));
        enableSaveButton(enabled);
    }, [bookmark?.display_name, bookmark?.file_id, bookmark?.link_url, bookmark?.type, enableSaveButton, formatMessage, original]);

    const close = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    const createBookmark = useCallback(async (b: ChannelBookmark) => {
        const res = await createChannelBookmark(serverUrl, channelId, b);
        if (res.bookmark) {
            close();
            return;
        }

        handleError((res.error as Error).message);
    }, [channelId, close, handleError, serverUrl]);

    const updateBookmark = useCallback(async (b: ChannelBookmark) => {
        const res = await editChannelBookmark(serverUrl, b);
        if (res.bookmarks) {
            close();
            return;
        }

        handleError((res.error as Error).message);
    }, [close, handleError, serverUrl]);

    const setLinkBookmark = useCallback((url: string, title: string, imageUrl: string) => {
        const b: ChannelBookmark = {
            ...(bookmark || emptyBookmark),
            owner_id: ownerId,
            channel_id: channelId,
            link_url: url,
            image_url: imageUrl,
            display_name: title,
            type: 'link',
        };

        setBookmarkToSave(b);
    }, [bookmark, channelId, setBookmarkToSave, ownerId]);

    const setFileBookmark = useCallback((f: ExtractedFileInfo) => {
        const b: ChannelBookmark = {
            ...(bookmark || emptyBookmark),
            owner_id: ownerId,
            channel_id: channelId,
            display_name: f.name,
            type: 'file',
            file_id: f.id,
        };
        setBookmarkToSave(b);
        setFile(f);
    }, [bookmark, channelId, ownerId, setBookmarkToSave]);

    const setBookmarkDisplayName = useCallback((displayName: string) => {
        if (bookmark) {
            setBookmark((prev) => ({
                ...(prev!),
                display_name: displayName,
            }));
        }

        enableSaveButton(Boolean(displayName));
    }, [bookmark, enableSaveButton]);

    const setBookmarkEmoji = useCallback((emoji?: string) => {
        if (bookmark) {
            setBookmark((prev) => ({
                ...prev!,
                emoji,
            }));

            const prevEmoji = original ? original.emoji : '';
            if (prevEmoji !== emoji) {
                enableSaveButton(true);
            }
        }

        if (emoji) {
            addRecentReaction(serverUrl, [emoji]);
        }
    }, [bookmark, enableSaveButton, original, serverUrl]);

    const resetBookmark = useCallback(() => {
        setBookmarkToSave(original);
        setFile(originalFile);
    }, [original, originalFile, setBookmarkToSave]);

    const onSaveBookmark = useCallback(async () => {
        if (bookmark) {
            enableSaveButton(false);
            setIsSaving(true);
            if (original) {
                updateBookmark(bookmark);
                return;
            }

            createBookmark(bookmark);
        }
    }, [bookmark, createBookmark, enableSaveButton, original, updateBookmark]);

    const handleDelete = useCallback(async () => {
        if (bookmark) {
            setIsSaving(true);
            enableSaveButton(false);
            const {error} = await deleteChannelBookmark(serverUrl, bookmark.channel_id, bookmark.id);
            if (error) {
                Alert.alert(
                    formatMessage({id: 'channel_bookmark.delete.failed_title', defaultMessage: 'Error deleting bookmark'}),
                    formatMessage({
                        id: 'channel_bookmark.add_edit.failed_desc',
                        defaultMessage: 'Details: {error}',
                    }, {error: getFullErrorMessage(error)}),
                );
                setIsSaving(false);
                enableSaveButton(true);
                return;
            }

            close();
        }
    }, [bookmark, enableSaveButton, serverUrl, close, formatMessage]);

    const onDelete = useCallback(async () => {
        if (bookmark) {
            Alert.alert(
                formatMessage({id: 'channel_bookmark.delete.confirm_title', defaultMessage: 'Delete bookmark'}),
                formatMessage({id: 'channel_bookmark.delete.confirm', defaultMessage: 'You sure want to delete the bookmark {displayName}?'}, {
                    displayName: bookmark.display_name,
                }),
                [{
                    text: formatMessage({id: 'channel_bookmark.delete.yes', defaultMessage: 'Yes'}),
                    style: 'destructive',
                    isPreferred: true,
                    onPress: handleDelete,
                }, {
                    text: formatMessage({id: 'channel_bookmark.add.file_cancel', defaultMessage: 'Cancel'}),
                    style: 'cancel',
                }],
            );
        }
    }, [bookmark, formatMessage, handleDelete]);

    useEffect(() => {
        enableSaveButton(false);
    }, []);

    useNavButtonPressed(RIGHT_BUTTON.id, componentId, onSaveBookmark, [bookmark]);
    useNavButtonPressed(closeButtonId, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.content}
            testID='channel_bookmark.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            {type === 'link' &&
                <BookmarkLink
                    disabled={isSaving}
                    initialUrl={original?.link_url}
                    setBookmark={setLinkBookmark}
                    resetBookmark={resetBookmark}
                />
            }
            {type === 'file' &&
                <AddBookmarkFile
                    channelId={channelId}
                    close={close}
                    disabled={isSaving}
                    initialFile={originalFile}
                    setBookmark={setFileBookmark}
                />
            }
            {Boolean(bookmark) &&
            <>
                <BookmarkDetail
                    disabled={isSaving}
                    emoji={bookmark?.emoji}
                    imageUrl={bookmark?.image_url}
                    title={bookmark?.display_name || ''}
                    file={file}
                    setBookmarkDisplayName={setBookmarkDisplayName}
                    setBookmarkEmoji={setBookmarkEmoji}
                />
                {canDeleteBookmarks &&
                <View style={styles.deleteContainer}>
                    <Button
                        size='m'
                        text='Delete bookmark'
                        iconName='trash-can-outline'
                        emphasis='tertiary'
                        onPress={onDelete}
                        theme={theme}
                        disabled={isSaving}
                        isDestructive={true}
                    />
                </View>
                }
            </>
            }
        </SafeAreaView>
    );
};

export default ChannelBookmarkAddOrEdit;
