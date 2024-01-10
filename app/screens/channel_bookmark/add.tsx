// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, StyleSheet, View, type AlertButton} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {addRecentReaction} from '@actions/local/reactions';
import {createChannelBookmark} from '@actions/remote/channel_bookmark';
import {uploadFile} from '@actions/remote/file';
import ProgressBar from '@components/progress_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';

import BookmarkDetail from './components/bookmark_detail';
import AddBookmarkFile from './components/bookmark_file';
import BookmarkLink from './components/bookmark_link';

import type {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    closeButtonId: string;
    componentId: AvailableScreens;
    ownerId: string;
    type: ChannelBookmarkType;
}

const styles = StyleSheet.create({
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
});

const RIGHT_BUTTON = buildNavigationButton('add-bookmark', 'channel_bookmark.add.save_button');
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

let cancelUpload: () => void | undefined;

const ChannelBookmarkAdd = ({channelId, componentId, closeButtonId, ownerId, type}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [bookmark, setBookmark] = useState<ChannelBookmark|undefined>();
    const [file, setFile] = useState<ExtractedFileInfo|undefined>();
    const [isSaving, setIsSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const enableSaveButton = (enabled: boolean) => {
        setButtons(componentId, {
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                text: formatMessage({id: 'channel_bookmark.add.save_button', defaultMessage: 'Save'}),
                enabled,
            }],
        });
    };

    const onProgress = (p: number, bytes: number) => {
        if (!file) {
            return;
        }

        const f: ExtractedFileInfo = {...file};
        f.bytesRead = bytes;

        setProgress(p);
        setFile(f);
    };

    const onComplete = (response: ClientResponse) => {
        if (!file || !bookmark) {
            return;
        }

        if (response.code !== 201) {
            handleError((response.data?.message as string | undefined) || 'Failed to upload the file: unknown error');
            return;
        }
        if (!response.data) {
            handleError('Failed to upload the file: no data received');
            return;
        }
        const data = response.data.file_infos as FileInfo[] | undefined;
        if (!data?.length) {
            handleError('Failed to upload the file: no data received');
            return;
        }

        const fileInfo = data[0];
        setFile(fileInfo);
        setUploading(false);
        const b = {...bookmark, file_id: fileInfo.id};
        createBookmark(b);
    };

    const onError = (response: ClientResponseError) => {
        const message = `upload error: ${response.message}` || 'Unkown error';
        setUploading(false);
        handleError(message);
    };

    const handleError = (error: string, buttons?: AlertButton[]) => {
        Alert.alert(
            formatMessage({id: 'channel_bookmark.add.failed_title', defaultMessage: 'Error adding bookmark'}),
            `Details:\n${error}`,
            buttons,
        );
        setIsSaving(false);
        enableSaveButton(Boolean(bookmark));
    };

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
    }, [bookmark, channelId, serverUrl]);

    const setLinkBookmark = useCallback((url: string, title: string, imageUrl: string) => {
        const b: ChannelBookmark = {
            ...emptyBookmark,
            owner_id: ownerId,
            channel_id: channelId,
            link_url: url,
            image_url: imageUrl,
            display_name: title,
            type: 'link',
        };
        setBookmarkToSave(b);
    }, [channelId, ownerId]);

    const setFileBookmark = useCallback((f: ExtractedFileInfo) => {
        const b: ChannelBookmark = {
            ...emptyBookmark,
            owner_id: ownerId,
            channel_id: channelId,
            display_name: decodeURIComponent(f.name),
            type: 'file',
        };
        setBookmarkToSave(b);
        setFile(f);
    }, [channelId, ownerId]);

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
            setBookmark({
                ...bookmark,
                emoji,
            });
        }
        if (emoji) {
            addRecentReaction(serverUrl, [emoji]);
        }
    }, [bookmark, serverUrl]);

    const setBookmarkToSave = useCallback((b?: ChannelBookmark) => {
        enableSaveButton(Boolean(b));
        setBookmark(b);
    }, [componentId, formatMessage, theme]);

    const resetBookmark = useCallback(() => {
        setBookmarkToSave(undefined);
    }, [setBookmarkToSave]);

    const onSaveBookmark = useCallback(async () => {
        if (bookmark) {
            enableSaveButton(false);
            setIsSaving(true);
            if (file && !file.id) {
                const {cancel, error} = uploadFile(serverUrl, file as FileInfo, channelId, onProgress, onComplete, onError);
                if (cancel) {
                    cancelUpload = cancel;
                }
                if (error) {
                    handleError((error as Error).message);
                }
                return;
            }

            createBookmark(bookmark);
        }
    }, [close, setBookmarkToSave, serverUrl, channelId, bookmark, file]);

    useEffect(() => {
        setBookmarkToSave(undefined);
    }, []);

    useDidUpdate(() => {
        if (cancelUpload && uploading) {
            cancelUpload();
        }
    }, [cancelUpload, uploading]);

    useNavButtonPressed(RIGHT_BUTTON.id, componentId, onSaveBookmark, [bookmark]);
    useNavButtonPressed(closeButtonId, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.content}
            testID='channel_bookmark_add.screen'
        >
            {type === 'link' &&
                <BookmarkLink
                    disabled={isSaving}
                    setBookmark={setLinkBookmark}
                    resetBookmark={resetBookmark}
                />
            }
            {type === 'file' &&
                <AddBookmarkFile
                    close={close}
                    disabled={isSaving}
                    onError={handleError}
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
                {Boolean(progress) &&
                <View style={styles.progress}>
                    <ProgressBar
                        progress={progress || 0}
                        color={theme.buttonBg}
                    />
                </View>
                }
            </>
            }
        </SafeAreaView>
    );
};

export default ChannelBookmarkAdd;
