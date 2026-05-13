// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Platform, StyleSheet} from 'react-native';
import Animated, {
    type EntryAnimationsValues, type ExitAnimationsValues, FadeIn, FadeOut,
    type SharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeSkinEmojiSelectorTutorial} from '@actions/app/global';
import TouchableEmoji from '@components/touchable_emoji';
import {useIsTablet} from '@hooks/device';
import useDidMount from '@hooks/did_mount';
import {skinCodes} from '@utils/emoji';

import CloseButton from './close_button';
import SkinSelector from './skin_selector';
import SkinSelectorTooltip from './tooltip';

type Props = {
    containerWidth: SharedValue<number>;
    isSearching: SharedValue<boolean>;
    skinTone?: string;
    tutorialWatched: boolean;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    expanded: {
        alignItems: 'center',
        flexDirection: 'row',
        width: '100%',
        zIndex: 2,
    },
    tooltipStyle: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 2,
        shadowOpacity: 0.16,
    },
});

const skins = Object.entries(skinCodes).reduce<Record<string, string>>((result, [value, skin]) => {
    if (value === 'default') {
        result[value] = 'hand';
    } else {
        result[value] = `hand_${skin}`;
    }
    return result;
}, {});

const SkinToneSelector = ({skinTone = 'default', containerWidth, isSearching, tutorialWatched}: Props) => {
    const [expanded, setExpanded] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const tutorialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTablet = useIsTablet();

    const tooltipContentStyle = useMemo(() => ({
        borderRadius: 8,
        maxWidth: isTablet ? 352 : undefined,
        padding: 0,
    }), [isTablet]);

    const exiting = (values: ExitAnimationsValues) => {
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
    };

    const entering = (values: EntryAnimationsValues) => {
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
    };

    const collapse = useCallback(() => {
        setExpanded(false);
    }, []);

    const expand = useCallback(() => {
        setExpanded(true);
    }, []);

    const close = useCallback(() => {
        setTooltipVisible(false);
        storeSkinEmojiSelectorTutorial();
    }, []);

    const widthAnimatedStyle = useAnimatedStyle(() => {
        return {
            width: withDelay(isSearching.value ? 0 : 700, withTiming(isSearching.value ? 0 : 32, {duration: isSearching.value ? 50 : 300})),
            marginLeft: Platform.OS === 'android' ? 10 : undefined,
            height: 34,
        };
    }, []);

    const opacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withDelay(isSearching.value ? 0 : 700, withTiming(isSearching.value ? 0 : 1, {duration: isSearching.value ? 50 : 350})),
        };
    }, []);

    useDidMount(() => {
        if (!tutorialWatched) {
            tutorialTimeoutRef.current = setTimeout(() => {
                setTooltipVisible(true);
            }, 500); // Give enough time for the transitions
        }

        return () => {
            if (tutorialTimeoutRef.current) {
                clearTimeout(tutorialTimeoutRef.current);
            }
        };
    });

    return (
        <>
            {!expanded &&
            <Tooltip
                isVisible={tooltipVisible}
                contentStyle={tooltipContentStyle}
                content={<SkinSelectorTooltip onClose={close}/>}
                placement={isTablet ? 'left' : 'top'}
                onClose={close}
                tooltipStyle={styles.tooltipStyle}
            >
                <Animated.View
                    style={widthAnimatedStyle}
                    exiting={Platform.select({ios: FadeOut})} /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */
                    entering={FadeIn}
                    collapsable={false}
                >
                    <Animated.View style={[styles.container, opacityStyle]}>
                        <TouchableEmoji
                            name={skins[skinTone]}
                            onEmojiPress={expand}
                            size={28}
                        />
                    </Animated.View>
                </Animated.View>
            </Tooltip>
            }
            {expanded &&
            <Animated.View
                style={styles.expanded}
                entering={entering}
                exiting={Platform.select({ios: exiting})} /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */
            >
                {!isTablet && <CloseButton collapse={collapse}/>}
                <SkinSelector
                    selected={skinTone}
                    skins={skins}
                    onSelectSkin={collapse}
                />
                {isTablet && <CloseButton collapse={collapse}/>}
            </Animated.View>
            }
        </>
    );
};

export default SkinToneSelector;
