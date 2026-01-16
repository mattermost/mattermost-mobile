// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View, type AlertButton} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {addRecentReaction} from '@actions/local/reactions';
import {createChannelBookmark, deleteChannelBookmark, editChannelBookmark} from '@actions/remote/channel_bookmark';
import Button from '@components/button';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BookmarkDetail from './components/bookmark_detail';
import AddBookmarkFile from './components/bookmark_file';
import BookmarkLink from './components/bookmark_link';

export type ChannelBookmarkScreenProps = {
    bookmark?: ChannelBookmark;
    canDeleteBookmarks?: boolean;
    channelId: string;
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

const ChannelBookmarkScreen = ({
    bookmark: original,
    canDeleteBookmarks = false,
    channelId,
    file: originalFile,
    ownerId,
    type,
}: ChannelBookmarkScreenProps) => {
    const navigation = useNavigation();
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const [bookmark, setBookmark] = useState<ChannelBookmark|undefined>(original);
    const [file, setFile] = useState<ExtractedFileInfo|undefined>(originalFile);
    const [enabled, setEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const setBookmarkToSave = useCallback((b?: ChannelBookmark | ((prev?: ChannelBookmark) => ChannelBookmark)) => {
        if (typeof b === 'function') {
            setBookmark((prev) => {
                const newBookmark = b(prev);
                setEnabled((newBookmark?.type === 'link' && Boolean(newBookmark?.link_url)) || (newBookmark?.type === 'file' && Boolean(newBookmark.file_id)));
                return newBookmark;
            });
        } else {
            setEnabled((b?.type === 'link' && Boolean(b?.link_url)) || (b?.type === 'file' && Boolean(b.file_id)));
            setBookmark(b);
        }
    }, []);

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
        const shouldEnable = Boolean(bookmark?.display_name &&
            ((bookmark?.type === 'link' && Boolean(bookmark?.link_url)) || (bookmark?.type === 'file' && Boolean(bookmark.file_id))));
        setEnabled(shouldEnable);
    }, [bookmark?.display_name, bookmark?.file_id, bookmark?.link_url, bookmark?.type, formatMessage, original]);

    const close = useCallback(() => {
        return navigateBack();
    }, []);

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
        setBookmarkToSave((prev) => {
            const b: ChannelBookmark = {
                ...(prev || emptyBookmark),
                owner_id: ownerId,
                channel_id: channelId,
                link_url: url,
                image_url: imageUrl,
                display_name: title,
                type: 'link',
            };
            return b;
        });
    }, [channelId, setBookmarkToSave, ownerId]);

    const setFileBookmark = useCallback((f: ExtractedFileInfo) => {
        setBookmarkToSave((prev) => {
            const b: ChannelBookmark = {
                ...(prev || emptyBookmark),
                owner_id: ownerId,
                channel_id: channelId,
                display_name: f.name,
                type: 'file',
                file_id: f.id,
            };
            return b;
        });
        setFile(f);
    }, [channelId, ownerId, setBookmarkToSave]);

    const setBookmarkDisplayName = useCallback((displayName: string) => {
        if (bookmark) {
            setBookmark((prev) => ({
                ...(prev!),
                display_name: displayName,
            }));
        }

        setEnabled(Boolean(displayName));
    }, [bookmark]);

    const setBookmarkEmoji = useCallback((emoji?: string) => {
        if (bookmark) {
            setBookmark((prev) => ({
                ...prev!,
                emoji,
            }));

            const prevEmoji = original ? original.emoji : '';
            if (prevEmoji !== emoji) {
                setEnabled(true);
            }
        }

        if (emoji) {
            addRecentReaction(serverUrl, [emoji]);
        }
    }, [bookmark, original, serverUrl]);

    const resetBookmark = useCallback(() => {
        setBookmarkToSave(original);
        setFile(originalFile);
    }, [original, originalFile, setBookmarkToSave]);

    const onSaveBookmark = useCallback(async () => {
        if (bookmark) {
            setEnabled(false);
            setIsSaving(true);
            if (original) {
                updateBookmark(bookmark);
                return;
            }

            createBookmark(bookmark);
        }
    }, [bookmark, createBookmark, original, updateBookmark]);

    const handleDelete = useCallback(async () => {
        if (bookmark) {
            setIsSaving(true);
            setEnabled(false);
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
                setEnabled(true);
                return;
            }

            close();
        }
    }, [bookmark, serverUrl, close, formatMessage]);

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
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={onSaveBookmark}
                    disabled={!enabled}
                    text={formatMessage({id: 'channel_bookmark.edit.save_button', defaultMessage: 'Save'})}
                    testID='channel_bookmark.edit.save_button'
                />
            ),
        });
    }, [enabled, formatMessage, navigation, onSaveBookmark]);

    useAndroidHardwareBackHandler(Screens.CHANNEL_BOOKMARK, close);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.content}
            testID='channel_bookmark.screen'
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

export default ChannelBookmarkScreen;
