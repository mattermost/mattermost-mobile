// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter, StyleSheet, Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import streamingStore from '@agents/store/streaming_store';
import {StreamingEvents} from '@agents/types';

import StreamingIndicator from './streaming_indicator';

import type PostModel from '@typings/database/models/servers/post';
import type {StreamingState} from '@agents/types';

interface AgentPostProps {
    serverUrl: string;
    post: PostModel;
}

/**
 * Custom post component for agent responses
 * Handles streaming text updates and displays animated cursor during generation
 */
const AgentPost = ({serverUrl, post}: AgentPostProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // Local state for streaming
    const [streamingState, setStreamingState] = useState<StreamingState | undefined>(
        () => streamingStore.getStreamingState(post.id),
    );

    useEffect(() => {
        // Subscribe to streaming events for this specific post
        const handleStreamingUpdate = (state: StreamingState) => {
            setStreamingState({...state});
        };

        const startedListener = DeviceEventEmitter.addListener(
            `${StreamingEvents.STARTED}_${post.id}`,
            handleStreamingUpdate,
        );

        const updatedListener = DeviceEventEmitter.addListener(
            `${StreamingEvents.UPDATED}_${post.id}`,
            handleStreamingUpdate,
        );

        const endedListener = DeviceEventEmitter.addListener(
            `${StreamingEvents.ENDED}_${post.id}`,
            handleStreamingUpdate,
        );

        return () => {
            startedListener.remove();
            updatedListener.remove();
            endedListener.remove();
        };
    }, [post.id]);

    // Determine the message to display
    const displayMessage = streamingState?.message || post.message || '';
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;

    return (
        <View style={styles.container}>
            {isPrecontent ? (
                <View style={styles.precontentContainer}>
                    <FormattedText
                        id='agents.generating'
                        defaultMessage='Generating response...'
                        style={styles.precontentText}
                    />
                    <StreamingIndicator precontent={true}/>
                </View>
            ) : (
                <View style={styles.messageContainer}>
                    {displayMessage ? (
                        <Markdown
                            baseTextStyle={styles.messageText}
                            textStyles={{}}
                            blockStyles={{}}
                            value={displayMessage}
                        />
                    ) : null}
                    {isGenerating && !isPrecontent && (
                        <StreamingIndicator/>
                    )}
                </View>
            )}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        messageContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
        },
        messageText: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        precontentContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
        },
        precontentText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 14,
            fontStyle: 'italic',
            marginRight: 8,
        },
    });
});

export default AgentPost;
