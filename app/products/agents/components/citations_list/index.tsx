// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {Linking, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Annotation} from '@agents/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CitationsListProps {
    annotations: Annotation[];
}

/**
 * Component to display a collapsible list of citations below the agent response
 */
const CitationsList = ({annotations}: CitationsListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!annotations || annotations.length === 0) {
        return null;
    }

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsCollapsed(!isCollapsed);
    };

    const handleCitationPress = (url: string) => {
        if (url) {
            Linking.openURL(url);
        }
    };

    // Extract domain from URL for display
    const getDomain = (url: string): string => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    };

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
                    name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={20}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
            </TouchableOpacity>

            {!isCollapsed && (
                <View style={styles.citationsList}>
                    {annotations.map((annotation, idx) => (
                        <TouchableOpacity
                            key={`citation-${annotation.index}-${idx}`}
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
                                    {annotation.title || getDomain(annotation.url)}
                                </Text>
                                <Text
                                    style={styles.citationUrl}
                                    numberOfLines={1}
                                >
                                    {getDomain(annotation.url)}
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
            )}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
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
            minHeight: 44, // Touch target size
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        headerText: {
            fontSize: 14,
            fontWeight: '600',
            color: changeOpacity(theme.centerChannelColor, 0.72),
            marginLeft: 8,
        },
        citationsList: {
            marginTop: 4,
        },
        citationItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginBottom: 8,
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            minHeight: 44, // Touch target size
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
            fontWeight: '600',
            color: theme.centerChannelColor,
            marginBottom: 2,
        },
        citationUrl: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    });
});

export default CitationsList;
