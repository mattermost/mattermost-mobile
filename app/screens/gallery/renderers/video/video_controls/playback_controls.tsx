// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {StyleSheet, View, Pressable} from 'react-native';

import {PlayIcon, PauseIcon, SeekIcon, type SeekIconRef} from './icons';

import type {VideoControlAction} from './types';

interface PlaybackControlsProps extends VideoControlAction {
    paused: boolean;
    seekSeconds: 0 | 10 | 30;
    onPlay: () => void;
    onPause: () => void;
    onRewind: () => void;
    onForward: () => void;
}

const styles = StyleSheet.create({
    playbackControls: {
        zIndex: 1,
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
        position: 'absolute',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        gap: 60,
    },
    button: {
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    handleControlAction,
    paused,
    seekSeconds,
    onPlay,
    onPause,
    onRewind,
    onForward,
}) => {
    const rewindIconRef = useRef<SeekIconRef>(null);
    const forwardIconRef = useRef<SeekIconRef>(null);

    const handlePlay = useCallback(() => {
        handleControlAction('play', onPlay);
    }, [onPlay, handleControlAction]);

    const handlePause = useCallback(() => {
        handleControlAction('pause', onPause);
    }, [onPause, handleControlAction]);

    const handleRewind = useCallback(() => {
        rewindIconRef.current?.triggerSpin();
        handleControlAction('rewind', onRewind);
    }, [onRewind, handleControlAction]);

    const handleForward = useCallback(() => {
        forwardIconRef.current?.triggerSpin();
        handleControlAction('forward', onForward);
    }, [onForward, handleControlAction]);

    return (
        <View
            pointerEvents='auto'
            style={styles.playbackControls}
        >
            <View style={styles.container}>
                {Boolean(seekSeconds) && (
                    <Pressable
                        style={styles.button}
                        onPress={handleRewind}
                    >
                        <SeekIcon
                            type='rewind'
                            seekSeconds={seekSeconds}
                            ref={rewindIconRef}
                        />
                    </Pressable>
                )}

                <Pressable
                    onPress={paused ? handlePlay : handlePause}
                >
                    {paused ? (
                        <PlayIcon/>
                    ) : (
                        <PauseIcon/>
                    )}
                </Pressable>

                {Boolean(seekSeconds) && (
                    <Pressable
                        style={styles.button}
                        onPress={handleForward}
                    >
                        <SeekIcon
                            type='fastForward'
                            seekSeconds={seekSeconds}
                            ref={forwardIconRef}
                        />
                    </Pressable>
                )}
            </View>
        </View>
    );
};

export default PlaybackControls;
