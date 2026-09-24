// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, type PressableStateCallbackType} from 'react-native';
import Animated, {Easing, FadeIn, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Duration/easing match CollapsibleBlock (app/components/block_renderer/layout_blocks.tsx),
// the app's other animated disclosure control, so both feel the same.
const ANIMATION_MS = 250;
const EASING = Easing.out(Easing.cubic);
const INDENT_PER_LEVEL = 12;

const messages = defineMessages({
    collapseHint: {id: 'collapsible_section.hint.collapse', defaultMessage: 'Activates to collapse'},
    expandHint: {id: 'collapsible_section.hint.expand', defaultMessage: 'Activates to expand'},
    labelHasError: {id: 'collapsible_section.label.has_error', defaultMessage: '{label}, contains an error'},
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 4,
    },
    containerBordered: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48, // Matches the app's standard row height (option_item ITEM_HEIGHT)
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    headerBordered: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
    },
    headerPressed: {
        opacity: 0.72,
    },
    chevron: {
        marginRight: 6,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    label: {
        flex: 1,
        color: theme.centerChannelColor,
        ...typography('Heading', 300, 'SemiBold'),
    },
    errorIcon: {
        marginLeft: 8,
        color: theme.errorTextColor,
    },

    // No horizontal padding here: the field components own their own 15px inset,
    // so adding padding would double-indent fields inside a section.
    content: {
        paddingBottom: 10,
    },
}));

type Props = {
    label: string;

    // Initial expanded state only — seeds internal state and re-syncs if the prop
    // changes (e.g. a multistep dialog refresh); the section is not otherwise controlled.
    initiallyExpanded: boolean;
    bordered: boolean;
    depth: number;
    hasError?: boolean;
    forceExpandVersion?: number;
    children: React.ReactNode;
}

const CollapsibleSection = ({label, initiallyExpanded, bordered, depth, hasError, forceExpandVersion, children}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const reducedMotion = useReducedMotion();
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

    // Drives the chevron rotation only. The content itself mounts/unmounts at its
    // natural height and the container's height change is animated by LinearTransition —
    // this keeps an initially-expanded section correct without measuring a clipped view.
    const rotation = useSharedValue(initiallyExpanded ? 1 : 0);

    // Re-sync when the prop changes (e.g. multistep dialog refreshes).
    useDidUpdate(() => {
        setIsExpanded(initiallyExpanded);
    }, [initiallyExpanded]);

    // Force-expand when the parent increments the version (e.g. after a failed submit
    // reveals that this section contains invalid fields). Version 0 / undefined = no-op;
    // any increment triggers an expand regardless of the user's current collapse state.
    useDidUpdate(() => {
        if (forceExpandVersion) {
            setIsExpanded(true);
        }
    }, [forceExpandVersion]);

    // Animate the chevron whenever the expanded state (or motion preference) changes.
    useDidUpdate(() => {
        const target = isExpanded ? 1 : 0;
        rotation.value = reducedMotion ? target : withTiming(target, {duration: ANIMATION_MS, easing: EASING});
    }, [isExpanded, reducedMotion]);

    const toggle = usePreventDoubleTap(useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []));

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${rotation.value * 90}deg`}],
    }));

    const pressableStyle = useCallback(({pressed}: PressableStateCallbackType) => [
        style.header,
        bordered && style.headerBordered,
        depth > 0 && {paddingLeft: depth * INDENT_PER_LEVEL},
        pressed && style.headerPressed,
    ], [style.header, style.headerBordered, style.headerPressed, bordered, depth]);

    const contentContainerStyle = depth > 0 ? [style.content, {paddingLeft: depth * INDENT_PER_LEVEL}] : style.content;

    const accessibilityHint = intl.formatMessage(isExpanded ? messages.collapseHint : messages.expandHint);

    // When collapsed with child errors, append to the a11y label so screen readers
    // announce "Section name, contains an error, collapsed, button" without relying
    // solely on the error icon color.
    const accessibilityLabel = hasError && !isExpanded ? intl.formatMessage(messages.labelHasError, {label}) : label;

    return (
        <Animated.View
            style={[style.container, bordered && style.containerBordered]}
            layout={reducedMotion ? undefined : LinearTransition.duration(ANIMATION_MS).easing(EASING)}
        >
            <Pressable
                onPress={toggle}
                style={pressableStyle}
                accessibilityRole='button'
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                accessibilityState={{expanded: isExpanded}}
            >
                {/* Chevron is purely decorative — hidden from the a11y tree on both platforms */}
                <Animated.View
                    style={chevronStyle}
                    accessibilityElementsHidden={true}
                    importantForAccessibility='no-hide-descendants'
                >
                    <CompassIcon
                        name='chevron-right'
                        size={18}
                        style={style.chevron}
                    />
                </Animated.View>
                <Text style={style.label}>{label}</Text>
                {hasError && !isExpanded && (
                    <CompassIcon
                        name='alert-circle-outline'
                        size={16}
                        style={style.errorIcon}

                        // Redundant with the a11y label above — keep it out of the reading order.
                        accessibilityElementsHidden={true}
                        importantForAccessibility='no-hide-descendants'
                    />
                )}
            </Pressable>
            {isExpanded && (
                <Animated.View
                    entering={reducedMotion ? undefined : FadeIn.duration(ANIMATION_MS)}
                    style={contentContainerStyle}
                >
                    {children}
                </Animated.View>
            )}
        </Animated.View>
    );
};

export default CollapsibleSection;
