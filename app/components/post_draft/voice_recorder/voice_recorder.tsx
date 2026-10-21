// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, type PressableStateCallbackType, type StyleProp, Text, View, type ViewStyle} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {useVoiceRecorder, type VoiceRecorderOptions} from '@hooks/use_voice_recorder';
import {usePreventDoubleTap} from '@hooks/utils';
import {formatVoiceNoteDuration, VOICE_NOTE_MAX_DURATION_MS} from '@utils/file/voice_note';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {QUICK_ACTIONS_HEIGHT} from '../quick_actions/quick_actions';

const PULSE_DURATION_MS = 800;
const PRESSED_OPACITY = 0.72;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: QUICK_ACTIONS_HEIGHT,
        marginLeft: 8,
    },
    status: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.dndIndicator,
        marginRight: 8,
    },
    timer: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
        fontVariant: ['tabular-nums'],
    },
    limit: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 100),
        marginLeft: 4,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    cancelButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    doneButton: {
        backgroundColor: theme.buttonBg,
    },
    pressed: {
        opacity: PRESSED_OPACITY,
    },
}));

type Props = Pick<VoiceRecorderOptions, 'onFinish' | 'onError'> & {
    testID?: string;
    onCancel: () => void;
};

/**
 * Replaces the composer quick actions while a voice note is being recorded. Recording
 * starts as soon as the bar mounts; the parent is told the result through `onFinish`,
 * `onCancel` or `onError` and is expected to unmount the bar afterwards.
 */
export default function VoiceRecorder({
    testID,
    onFinish,
    onCancel,
    onError,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {elapsedMs, start, stop, cancel} = useVoiceRecorder({onFinish, onError});

    const pulse = useSharedValue(1);
    const dotStyle = useAnimatedStyle(() => ({opacity: pulse.value}));

    useDidMount(() => {
        pulse.value = withRepeat(withTiming(0.2, {duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.ease)}), -1, true);
        start();
    });

    const handleCancel = usePreventDoubleTap(useCallback(async () => {
        await cancel();
        onCancel();
    }, [cancel, onCancel]));

    const handleDone = usePreventDoubleTap(useCallback(() => {
        stop();
    }, [stop]));

    const cancelStyle = useCallback(({pressed}: PressableStateCallbackType): StyleProp<ViewStyle> => [
        styles.button,
        styles.cancelButton,
        pressed && styles.pressed,
    ], [styles]);

    const doneStyle = useCallback(({pressed}: PressableStateCallbackType): StyleProp<ViewStyle> => [
        styles.button,
        styles.doneButton,
        pressed && styles.pressed,
    ], [styles]);

    const elapsed = formatVoiceNoteDuration(elapsedMs);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <View
                style={styles.status}
                accessible={true}
                accessibilityLiveRegion='polite'
                accessibilityLabel={intl.formatMessage({
                    id: 'mobile.voice_note.recording_accessibility',
                    defaultMessage: 'Recording voice note, {elapsed}',
                }, {elapsed})}
            >
                <Animated.View style={[styles.dot, dotStyle]}/>
                <Text
                    style={styles.timer}
                    testID={`${testID}.timer`}
                >
                    {elapsed}
                </Text>
                <Text style={styles.limit}>
                    {`/ ${formatVoiceNoteDuration(VOICE_NOTE_MAX_DURATION_MS)}`}
                </Text>
            </View>
            <Pressable
                testID={`${testID}.cancel`}
                onPress={handleCancel}
                style={cancelStyle}
                accessibilityRole='button'
                accessibilityLabel={intl.formatMessage({
                    id: 'mobile.voice_note.cancel',
                    defaultMessage: 'Cancel recording',
                })}
            >
                <CompassIcon
                    name='close'
                    size={ICON_SIZE}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
            </Pressable>
            <Pressable
                testID={`${testID}.done`}
                onPress={handleDone}
                style={doneStyle}
                accessibilityRole='button'
                accessibilityLabel={intl.formatMessage({
                    id: 'mobile.voice_note.done',
                    defaultMessage: 'Finish recording and attach voice note',
                })}
            >
                <CompassIcon
                    name='check'
                    size={ICON_SIZE}
                    color={theme.buttonColor}
                />
            </Pressable>
        </View>
    );
}
