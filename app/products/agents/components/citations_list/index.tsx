// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TOUCH_TARGET_SIZE} from '@agents/constants';
import React, {useCallback, useEffect, useState} from 'react';
import {type LayoutChangeEvent, Text, TouchableOpacity, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getUrlDomain, tryOpenURL} from '@utils/url';

import type {Annotation} from '@agents/types';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.12),
            paddingTop: 12,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            minHeight: TOUCH_TARGET_SIZE,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        headerText: {
            fontSize: 14,
            fontWeight: 600,
            color: changeOpacity(theme.centerChannelColor, 0.72),
            marginLeft: 8,
        },
        citationsList: {
            overflow: 'hidden',
        },
        citationsContentWrapper: {
            position: 'absolute',
            width: '100%',
        },
        citationItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginBottom: 8,
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            minHeight: TOUCH_TARGET_SIZE,
        },
        citationIcon: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: changeOpacity(theme.linkColor, 0.08),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        citationContent: {
            flex: 1,
            marginRight: 8,
        },
        citationTitle: {
            fontSize: 14,
            fontWeight: 600,
            color: theme.centerChannelColor,
            marginBottom: 2,
        },
        citationUrl: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

interface CitationsListProps {
    annotations: Annotation[];
}

/**
 * Component to display a collapsible list of citations below the agent response
 */
const CitationsList = ({annotations}: CitationsListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [isExpanded, setIsExpanded] = useState(false);
    const progress = useSharedValue(0);
    const contentHeight = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(isExpanded ? 1 : 0, {duration: 250});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progress is a stable shared value ref
    }, [isExpanded]);

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleContentLayout = useCallback((e: LayoutChangeEvent) => {
        contentHeight.value = e.nativeEvent.layout.height;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contentHeight is a stable shared value ref
    }, []);

    const handleCitationPress = useCallback((url: string) => {
        if (url) {
            tryOpenURL(url);
        }
    }, []);

    const collapsibleStyle = useAnimatedStyle(() => {
        const p = progress.value;
        return {
            height: contentHeight.value > 0 ? p * contentHeight.value : 0,
            opacity: p,
            marginTop: p * 4,
        };
    });

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={handleToggle}
                style={styles.header}
                testID='citations.list.toggle'
            >
                <View style={styles.headerLeft}>
                    <CompassIcon
                        name='link-variant'
                        size={16}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <FormattedText
                        id='agents.citations.title'
                        defaultMessage='Sources ({count})'
                        values={{count: annotations.length}}
                        style={styles.headerText}
                    />
                </View>
                <CompassIcon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
            </TouchableOpacity>

            <Animated.View style={[styles.citationsList, collapsibleStyle]}>
                <View
                    onLayout={handleContentLayout}
                    style={styles.citationsContentWrapper}
                >
                    {annotations.map((annotation) => (
                        <TouchableOpacity
                            key={`citation-${annotation.index}-${annotation.url}`}
                            onPress={() => handleCitationPress(annotation.url)}
                            style={styles.citationItem}
                            testID={`citations.list.item.${annotation.index}`}
                        >
                            <View style={styles.citationIcon}>
                                <CompassIcon
                                    name='link-variant'
                                    size={14}
                                    color={theme.linkColor}
                                />
                            </View>
                            <View style={styles.citationContent}>
                                <Text
                                    style={styles.citationTitle}
                                    numberOfLines={2}
                                >
                                    {annotation.title || getUrlDomain(annotation.url)}
                                </Text>
                                <Text
                                    style={styles.citationUrl}
                                    numberOfLines={1}
                                >
                                    {getUrlDomain(annotation.url)}
                                </Text>
                            </View>
                            <CompassIcon
                                name='open-in-new'
                                size={16}
                                color={changeOpacity(theme.centerChannelColor, 0.56)}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
};

export default CitationsList;
