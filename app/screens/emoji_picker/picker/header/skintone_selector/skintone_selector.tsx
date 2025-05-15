// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {InteractionManager, Platform, StyleSheet} from 'react-native';
import Animated, {
    type EntryAnimationsValues, type ExitAnimationsValues, FadeIn, FadeOut,
    type SharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeSkinEmojiSelectorTutorial} from '@actions/app/global';
import TouchableEmoji from '@components/touchable_emoji';
import {useIsTablet} from '@hooks/device';
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
    const isTablet = useIsTablet();

    const tooltipContentStyle = useMemo(() => ({
        borderRadius: 8,
        maxWidth: isTablet ? 352 : undefined,
        padding: 0,
    }), [isTablet]);

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

    useEffect(() => {
        InteractionManager.runAfterInteractions(() => {
            if (!tutorialWatched) {
                setTooltipVisible(true);
            }
        });
    }, []);

    return (
        <>
            {!expanded &&
            <Tooltip
                isVisible={tooltipVisible}
                useInteractionManager={true}
                contentStyle={tooltipContentStyle}
                content={<SkinSelectorTooltip onClose={close}/>}
                placement={isTablet ? 'left' : 'top'}
                onClose={close}
                tooltipStyle={styles.tooltipStyle}
            >
                <Animated.View
                    style={widthAnimatedStyle}
                    exiting={Platform.OS === 'android' ? undefined : FadeOut /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */}
                    entering={FadeIn}
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
                exiting={exiting}
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
