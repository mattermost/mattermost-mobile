// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, ScrollView} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {HOME_PADDING} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Tab = {
    id: string;
    title: string;
    icon: string;
    hasUnread?: boolean;
}

type Props = {
    tabs: Tab[];
    activeTab: string;
    onTabPress: (tabId: string) => void;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
    },
    scrollView: {
        ...HOME_PADDING,
        paddingVertical: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 4,
        borderRadius: 20,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.16),
    },
    iconContainer: {
        marginRight: 6,
    },
    icon: {
        fontSize: 20,
    },
    activeIcon: {
        color: theme.sidebarText,
    },
    inactiveIcon: {
        color: changeOpacity(theme.sidebarText, 0.56),
    },
    tabText: {
        ...typography('Body', 100, 'SemiBold'),
        fontSize: 14,
    },
    activeTabText: {
        color: theme.sidebarText,
    },
    inactiveTabText: {
        color: changeOpacity(theme.sidebarText, 0.64),
    },
    unreadDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.mentionBg,
    },
}));

const DaakiaTabs = ({tabs, activeTab, onTabPress}: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollView}
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <TouchableWithFeedback
                            key={tab.id}
                            onPress={() => onTabPress(tab.id)}
                            style={[
                                styles.tab,
                                isActive && styles.activeTab,
                            ]}
                            type='opacity'
                        >
                            <View style={styles.iconContainer}>
                                <CompassIcon
                                    name={tab.icon}
                                    style={[
                                        styles.icon,
                                        isActive ? styles.activeIcon : styles.inactiveIcon,
                                    ]}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.tabText,
                                    isActive ? styles.activeTabText : styles.inactiveTabText,
                                ]}
                            >
                                {tab.title}
                            </Text>
                            {tab.hasUnread && (
                                <View style={styles.unreadDot}/>
                            )}
                        </TouchableWithFeedback>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export default DaakiaTabs;
