// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View, type AlertButton} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {addRecentReaction} from '@actions/local/reactions';
import {deleteChannelBookmark, editChannelBookmark} from '@actions/remote/channel_bookmark';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BookmarkDetail from './components/bookmark_detail';
import AddBookmarkFile from './components/bookmark_file';
import BookmarkLink from './components/bookmark_link';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bookmark: ChannelBookmark;
    file?: FileInfo;
    canDeleteBookmarks: boolean;
    closeButtonId: string;
    componentId: AvailableScreens;
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

const ChannelBookmarkEdit = ({bookmark: original, canDeleteBookmarks, componentId, closeButtonId, file: originalFile}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const [bookmark, setBookmark] = useState<ChannelBookmark>(original);
    const [file, setFile] = useState<ExtractedFileInfo|undefined>(originalFile);
    const [isSaving, setIsSaving] = useState(false);

    const enableSaveButton = (enabled: boolean) => {
        setButtons(componentId, {
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                text: formatMessage({id: 'channel_bookmark.edit.save_button', defaultMessage: 'Save'}),
                enabled,
            }],
        });
    };

    const handleError = (error: string, buttons?: AlertButton[]) => {
        Alert.alert(
            formatMessage({id: 'channel_bookmark.edit.failed_title', defaultMessage: 'Error editing bookmark'}),
            `Details:\n${error}`,
            buttons,
        );
        setIsSaving(false);
        enableSaveButton(Boolean(bookmark));
    };

    const close = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    const updateBookmark = useCallback(async (b: ChannelBookmark) => {
        const res = await editChannelBookmark(serverUrl, b);
        if (res.bookmarks) {
            close();
            return;
        }

        handleError((res.error as Error).message);
    }, [bookmark, serverUrl]);

    const setLinkBookmark = useCallback((url: string, title: string, imageUrl: string) => {
        const b: ChannelBookmark = {
            ...bookmark,
            link_url: url,
            image_url: imageUrl,
            display_name: title,
            type: 'link',
        };
        setBookmarkToSave(b);
    }, [bookmark]);

    const setFileBookmark = useCallback((f: ExtractedFileInfo) => {
        const b: ChannelBookmark = {
            ...bookmark,
            display_name: decodeURIComponent(f.name),
            type: 'file',
            file_id: f.id,
        };
        setBookmarkToSave(b);
        setFile(f);
    }, [bookmark]);

    const setBookmarkDisplayName = useCallback((displayName: string) => {
        if (bookmark) {
            setBookmark({
                ...bookmark,
                display_name: displayName,
            });
        }

        enableSaveButton(Boolean(displayName));
    }, [bookmark]);

    const setBookmarkEmoji = useCallback((emoji?: string) => {
        if (bookmark) {
            const prev = original.emoji ? original.emoji : '';
            setBookmark({
                ...bookmark,
                emoji,
            });

            if (prev !== emoji) {
                enableSaveButton(true);
            }
        }
        if (emoji) {
            addRecentReaction(serverUrl, [emoji]);
        }
    }, [bookmark, original, serverUrl]);

    const setBookmarkToSave = useCallback((b: ChannelBookmark) => {
        enableSaveButton((b?.type === 'link' && Boolean(b?.link_url)) || (b?.type === 'file' && Boolean(b.file_id)));
        setBookmark(b);
    }, [componentId, formatMessage, theme]);

    const resetBookmark = useCallback(() => {
        setBookmarkToSave(original);
        setFile(originalFile);
    }, [setBookmarkToSave, original, originalFile]);

    const onSaveBookmark = useCallback(async () => {
        if (bookmark) {
            enableSaveButton(false);
            setIsSaving(true);
            updateBookmark(bookmark);
        }
    }, [close, setBookmarkToSave, serverUrl, bookmark, file]);

    const handleDelete = useCallback(async () => {
        setIsSaving(true);
        enableSaveButton(false);
        const res = await deleteChannelBookmark(serverUrl, bookmark.channel_id, bookmark.id);
        if (res.error) {
            Alert.alert(
                formatMessage({id: 'channel_bookmark.delete.failed_title', defaultMessage: 'Error deleting bookmark'}),
                `Details:\n${res.error}`,
            );
            setIsSaving(false);
            enableSaveButton(true);
            return;
        }

        close();
    }, [bookmark, serverUrl]);

    const onDelete = useCallback(async () => {
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
    }, [bookmark, handleDelete]);

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
            testID='channel_bookmark_add.screen'
        >
            {bookmark.type === 'link' &&
                <BookmarkLink
                    disabled={isSaving}
                    initialUrl={bookmark.link_url}
                    setBookmark={setLinkBookmark}
                    resetBookmark={resetBookmark}
                />
            }
            {bookmark.type === 'file' &&
                <AddBookmarkFile
                    channelId={bookmark.channel_id}
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
                    emoji={bookmark.emoji}
                    imageUrl={bookmark.image_url}
                    title={bookmark.display_name}
                    file={file}
                    setBookmarkDisplayName={setBookmarkDisplayName}
                    setBookmarkEmoji={setBookmarkEmoji}
                />
                {canDeleteBookmarks &&
                <View style={styles.deleteContainer}>
                    <Button
                        buttonType='destructive'
                        size='m'
                        text='Delete bookmark'
                        iconName='trash-can-outline'
                        textStyle={styles.deleteText}
                        backgroundStyle={styles.deleteBg}
                        iconSize={18}
                        onPress={onDelete}
                        theme={theme}
                        disabled={isSaving}
                    />
                </View>
                }
            </>
            }
        </SafeAreaView>
    );
};

export default ChannelBookmarkEdit;
