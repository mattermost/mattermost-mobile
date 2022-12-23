// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {setShareExtensionUserAndChannelIds, useShareExtensionState} from '@share/state';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Attachments from './attachments';
import LinkPreview from './link_preview';
import Message from './message';
import Options from './options';

import type {Database} from '@nozbe/watermelondb';

type Props = {
    currentChannelId: string;
    currentUserId: string;
    database: Database;
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    content: {
        paddingTop: 20,
    },
    divider: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 1,
        marginBottom: 8,
        marginHorizontal: 20,
        marginTop: 20,
    },
}));

const ContentView = ({database, currentChannelId, currentUserId, theme}: Props) => {
    const {linkPreviewUrl, files, serverUrl, channelId} = useShareExtensionState();
    const styles = getStyles(theme);

    useEffect(() => {
        setShareExtensionUserAndChannelIds(currentUserId, currentChannelId);
    }, [currentUserId, currentChannelId]);

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView
                bounces={false}
                enableAutomaticScroll={true}
                enableOnAndroid={false}
                enableResetScrollToCoords={true}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'
                scrollToOverflowEnabled={true}
                contentContainerStyle={styles.content}
            >
                {Boolean(linkPreviewUrl) &&
                <LinkPreview
                    theme={theme}
                    url={linkPreviewUrl!}
                />
                }
                {files.length > 0 &&
                <Attachments
                    database={database}
                    theme={theme}
                />
                }
                {(files.length > 0 || Boolean(linkPreviewUrl)) &&
                <View style={styles.divider}/>
                }
                <Options
                    channelId={channelId}
                    database={database}
                    serverUrl={serverUrl}
                    theme={theme}
                />
                <View style={styles.divider}/>
                <Message theme={theme}/>
            </KeyboardAwareScrollView>
        </View>
    );
};

export default ContentView;
