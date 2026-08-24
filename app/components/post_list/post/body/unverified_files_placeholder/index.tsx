// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsInViewPort} from '@hooks/in_viewport';
import {usePreventDoubleTap} from '@hooks/utils';
import RedactionRevalidationManager from '@managers/redaction_revalidation_manager';
import WebsocketManager from '@managers/websocket_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        backgroundColor: theme.centerChannelBg,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 16,
        marginTop: 8,
        gap: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200, 'SemiBold'),
    },
    retry: {
        color: theme.linkColor,
        ...typography('Body', 75, 'SemiBold'),
        marginTop: 2,
    },
}));

const PRESSED_STYLE = {opacity: 0.72};

type Props = {
    postId: string;
    location: AvailableScreens;
    requiredEpoch: number;
};

/**
 * Shown while a post's attachment decision is known to be out of date.
 *
 * Not the "Files not available" copy: that asserts a denial, while this is an unknown decision.
 * Claiming denial would turn a stale cache into a false accusation; showing the files would expose
 * attachments the server may since have withheld.
 */
const UnverifiedFilesPlaceholder = ({postId, location, requiredEpoch}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    // Per-server reachability, not device connectivity: only this server can supply the decision.
    const [isConnected, setIsConnected] = useState(true);
    useEffect(() => {
        const subscription = WebsocketManager.observeWebsocketState(serverUrl).subscribe((state) => {
            setIsConnected(state === 'connected');
        });
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    // Revalidating every unverified post would cost a request per cached post.
    const inViewPort = useIsInViewPort(location, postId);

    useEffect(() => {
        if (inViewPort && isConnected) {
            RedactionRevalidationManager.enqueue(serverUrl, postId, requiredEpoch);
        }
    }, [inViewPort, isConnected, serverUrl, postId, requiredEpoch]);

    const onRetry = usePreventDoubleTap(useCallback(() => {
        RedactionRevalidationManager.enqueue(serverUrl, postId, requiredEpoch);
    }, [serverUrl, postId, requiredEpoch]));

    return (
        <View
            style={styles.container}
            testID='unverified-files-placeholder'
        >
            <CompassIcon
                name='lock-outline'
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.64)}
                testID='unverified-files-placeholder.icon'
            />
            <View style={styles.textContainer}>
                {isConnected ? (
                    <FormattedText
                        id='post.unverified_files.checking'
                        defaultMessage='Checking file access'
                        style={styles.title}
                        testID='unverified-files-placeholder.title'
                    />
                ) : (
                    <>
                        <FormattedText
                            id='post.unverified_files.offline'
                            defaultMessage='Connect to verify file access'
                            style={styles.title}
                            testID='unverified-files-placeholder.title'
                        />
                        <Pressable
                            onPress={onRetry}
                            style={({pressed}) => [pressed && PRESSED_STYLE]}
                            testID='unverified-files-placeholder.retry'
                        >
                            <FormattedText
                                id='post.unverified_files.retry'
                                defaultMessage='Try again'
                                style={styles.retry}
                            />
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
};

export default React.memo(UnverifiedFilesPlaceholder);
