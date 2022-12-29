// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Platform, TouchableOpacity} from 'react-native';
import Animated, {EntryAnimationsValues, ExitAnimationsValues, FadeIn, FadeOut, SharedValue, useAnimatedStyle, withDelay, withTiming} from 'react-native-reanimated';

import {savePreferredSkinTone} from '@actions/remote/preference';
import {useIsTablet} from '@app/hooks/device';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {skinCodes} from '@utils/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import TouchableEmoji from '../sections/touchable_emoji';

type Props = {
    containerWidth: SharedValue<number>;
    isSearching: SharedValue<boolean>;
    skinTone?: string;
}

const SIZE = 42;
const EMOJI_SIZE = 32;
const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        height: SIZE,
        width: SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expanded: {
        alignItems: 'center',
        flexDirection: 'row',
        width: '100%',
        zIndex: 2,
    },
    skins: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    textContainer: {
        marginHorizontal: 16,
        maxWidth: 57,
    },
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const skins = Object.keys(skinCodes).reduce<Record<string, string>>((result, value) => {
    const skin = skinCodes[value];
    if (value === 'default') {
        result[value] = 'hand';
    } else {
        result[value] = `hand_${skin}`;
    }
    return result;
}, {});

const SkinToneSelector = ({skinTone = 'default', containerWidth, isSearching}: Props) => {
    const [expanded, setExpanded] = useState(false);
    const theme = useTheme();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const exiting = useCallback((values: ExitAnimationsValues) => {
        'worklet';
        const animations = {
            originX: withTiming(containerWidth.value, {duration: 250}),
            opacity: withTiming(0, {duration: 250}),
        };
        const initialValues = {
            originX: values.currentOriginX,
            opacity: 1,
        };
        return {
            initialValues,
            animations,
        };
    }, [containerWidth.value]);

    const entering = useCallback((values: EntryAnimationsValues) => {
        'worklet';
        const animations = {
            originX: withTiming(values.targetOriginX, {duration: 250}),
            opacity: withTiming(1, {duration: 300}),
        };
        const initialValues = {
            originX: containerWidth.value - 122,
            opacity: 0,
        };
        return {
            initialValues,
            animations,
        };
    }, [containerWidth.value]);

    const collapse = useCallback(() => {
        setExpanded(false);
    }, []);

    const expand = useCallback(() => {
        setExpanded(true);
    }, []);

    const onSelectSkin = useCallback(async (emoji: string) => {
        const skin = emoji.split('hand_')[1] || 'default';
        const code = Object.keys(skinCodes).find((key) => skinCodes[key] === skin) || 'default';
        await savePreferredSkinTone(serverUrl, code);
        collapse();
    }, [serverUrl]);

    const widthAnimatedStyle = useAnimatedStyle(() => {
        return {
            width: withDelay(isSearching.value ? 0 : 700, withTiming(isSearching.value ? 0 : 32, {duration: isSearching.value ? 50 : 300})),
            marginLeft: Platform.OS === 'android' ? 10 : undefined,
        };
    }, []);

    const opacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withDelay(isSearching.value ? 0 : 700, withTiming(isSearching.value ? 0 : 1, {duration: isSearching.value ? 50 : 350})),
        };
    }, []);

    const closeButton = (
        <TouchableOpacity
            hitSlop={hitSlop}
            onPress={collapse}
        >
            <CompassIcon
                name='close'
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
        </TouchableOpacity>
    );

    return (
        <>
            {!expanded &&
            <Animated.View
                style={widthAnimatedStyle}
                exiting={FadeOut}
                entering={FadeIn}
            >
                <Animated.View style={[styles.container, opacityStyle]}>
                    <TouchableEmoji
                        name={skins[skinTone]}
                        onEmojiPress={expand}
                        size={EMOJI_SIZE}
                    />
                </Animated.View>
            </Animated.View>
            }
            {expanded &&
            <Animated.View
                style={styles.expanded}
                entering={entering}
                exiting={exiting}
            >
                {!isTablet && closeButton}
                <Animated.View style={[styles.textContainer, isTablet && {marginLeft: 0}]}>
                    <FormattedText
                        id='default_skin_tones'
                        defaultMessage='Default Skin Tone'
                        style={styles.text}
                    />
                </Animated.View>
                <Animated.View style={[styles.skins, isTablet && {marginRight: 10}]}>
                    {Object.values(skins).map((name) => (
                        <Animated.View
                            key={name}
                            style={styles.container}
                        >
                            <TouchableEmoji
                                name={name}
                                size={EMOJI_SIZE}
                                onEmojiPress={onSelectSkin}
                            />
                        </Animated.View>
                    ))}
                </Animated.View>
                {isTablet && closeButton}
            </Animated.View>
            }
        </>
    );
};

export default SkinToneSelector;
