// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, type PressableStateCallbackType} from 'react-native';
import Animated, {Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Match CollapsibleBlock so both disclosure controls feel the same.
const ANIMATION_MS = 250;
const EASING = Easing.out(Easing.cubic);
const INDENT_PER_LEVEL = 12;

// One inset on the container; nested sections compound it via the tree.
const indentStyle = {marginLeft: INDENT_PER_LEVEL};

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

    // No horizontal padding: fields own their 15px inset.
    content: {
        paddingBottom: 10,
    },
}));

type Props = {
    label: string;

    // Initial state only; re-syncs on change (e.g. multistep refresh), not controlled.
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

    // A nested section mounts already force-expanded, which useDidUpdate skips; seed it
    // here. Gate on hasError so a stale version doesn't re-expand on every remount.
    const [isExpanded, setIsExpanded] = useState(() => initiallyExpanded || Boolean(forceExpandVersion && hasError));

    // Chevron rotation only; the container's height is animated by LinearTransition.
    const rotation = useSharedValue(initiallyExpanded || (forceExpandVersion && hasError) ? 1 : 0);

    // Re-sync when the prop changes (e.g. multistep dialog refreshes).
    useDidUpdate(() => {
        setIsExpanded(initiallyExpanded);
    }, [initiallyExpanded]);

    // Force-expand on each version bump (e.g. a failed submit revealed invalid fields).
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
        pressed && style.headerPressed,
    ], [style.header, style.headerBordered, style.headerPressed, bordered]);

    const accessibilityHint = intl.formatMessage(isExpanded ? messages.collapseHint : messages.expandHint);

    // Announce the error in the a11y label, not just via the icon color.
    const accessibilityLabel = hasError && !isExpanded ? intl.formatMessage(messages.labelHasError, {label}) : label;

    return (
        <Animated.View
            style={[style.container, bordered && style.containerBordered, depth > 0 && indentStyle]}
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

                    // Fade out on collapse so content doesn't pop before the height settles.
                    exiting={reducedMotion ? undefined : FadeOut.duration(ANIMATION_MS)}
                    style={style.content}
                >
                    {children}
                </Animated.View>
            )}
        </Animated.View>
    );
};

export default CollapsibleSection;
