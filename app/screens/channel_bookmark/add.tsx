// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, StyleSheet, type AlertButton} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {addRecentReaction} from '@actions/local/reactions';
import {createChannelBookmark} from '@actions/remote/channel_bookmark';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';

import BookmarkDetail from './components/bookmark_detail';
import AddBookmarkFile from './components/bookmark_file';
import BookmarkLink from './components/bookmark_link';

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

const ChannelBookmarkAdd = ({channelId, componentId, closeButtonId, ownerId, type}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [bookmark, setBookmark] = useState<ChannelBookmark|undefined>();
    const [file, setFile] = useState<ExtractedFileInfo|undefined>();
    const [isSaving, setIsSaving] = useState(false);

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
            file_id: f.id,
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
        enableSaveButton((b?.type === 'link' && Boolean(b?.link_url)) || (b?.type === 'file' && Boolean(b.file_id)));
        setBookmark(b);
    }, [componentId, formatMessage, theme]);

    const resetBookmark = useCallback(() => {
        setBookmarkToSave(undefined);
    }, [setBookmarkToSave]);

    const onSaveBookmark = useCallback(async () => {
        if (bookmark) {
            enableSaveButton(false);
            setIsSaving(true);
            createBookmark(bookmark);
        }
    }, [close, setBookmarkToSave, serverUrl, channelId, bookmark, file]);

    useEffect(() => {
        setBookmarkToSave(undefined);
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
            {type === 'link' &&
                <BookmarkLink
                    disabled={isSaving}
                    setBookmark={setLinkBookmark}
                    resetBookmark={resetBookmark}
                />
            }
            {type === 'file' &&
                <AddBookmarkFile
                    channelId={channelId}
                    close={close}
                    disabled={isSaving}
                    setBookmark={setFileBookmark}
                />
            }
            {Boolean(bookmark) &&
            <BookmarkDetail
                disabled={isSaving}
                emoji={bookmark?.emoji}
                imageUrl={bookmark?.image_url}
                title={bookmark?.display_name || ''}
                file={file}
                setBookmarkDisplayName={setBookmarkDisplayName}
                setBookmarkEmoji={setBookmarkEmoji}
            />
            }
        </SafeAreaView>
    );
};

export default ChannelBookmarkAdd;
