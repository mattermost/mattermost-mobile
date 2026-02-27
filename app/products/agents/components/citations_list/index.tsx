// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TOUCH_TARGET_SIZE} from '@agents/constants';
import React, {useCallback, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

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

    const handleToggle = useCallback(() => {
        setIsExpanded((prevExpanded) => !prevExpanded);
    }, []);

    const handleCitationPress = useCallback((url: string) => {
        if (url) {
            tryOpenURL(url);
        }
    }, []);

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

            {isExpanded && (
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
            )}
        </View>
    );
};

export default CitationsList;
