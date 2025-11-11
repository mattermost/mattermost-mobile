// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text} from 'react-native';

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
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    tabsContainer: {
        ...HOME_PADDING,
        paddingVertical: 8,
        flexDirection: 'row',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        marginHorizontal: 2,
        borderRadius: 8,
        position: 'relative',
        backgroundColor: 'transparent',
        minHeight: 40,
    },
    activeTab: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
    },
    iconContainer: {
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 18,
    },
    activeIcon: {
        color: theme.buttonBg,
    },
    inactiveIcon: {
        color: changeOpacity(theme.sidebarText, 0.6),
    },
    tabText: {
        ...typography('Body', 100, 'SemiBold'),
        fontSize: 13,
        letterSpacing: 0.2,
    },
    activeTabText: {
        color: theme.buttonBg,
    },
    inactiveTabText: {
        color: changeOpacity(theme.sidebarText, 0.7),
    },
    unreadDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.mentionBg,
        borderWidth: 1.5,
        borderColor: theme.sidebarBg,
    },
}));

const DaakiaTabs = ({tabs, activeTab, onTabPress}: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={styles.container}>
            <View style={styles.tabsContainer}>
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
            </View>
        </View>
    );
};

export default DaakiaTabs;
