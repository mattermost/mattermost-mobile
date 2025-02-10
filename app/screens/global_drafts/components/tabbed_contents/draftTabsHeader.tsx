// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {Pressable, Text, Touchable, View} from 'react-native';

import Badge from '@components/badge';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const DRAFT_TAB_INDEX = 0;
const SCHEDULED_POSTS_TAB_INDEX = 1;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        tabContainer: {

            // borderWidth: 1,
            // borderColor: 'red',

            display: 'flex',
            flexDirection: 'row',
            height: 44,
        },
        tab: {

            // borderWidth: 1,
            // borderColor: 'blue',
            width: '50%',
            flex: 1,
            flexDirection: 'row',
            position: 'relative',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderBottomWidth: 2,
            borderColor: 'transparent',
        },
        activeTab: {
            borderBottomColor: theme.buttonBg,
        },
        badgeStyles: {
            position: 'relative',
            color: changeOpacity(theme.centerChannelColor, 0.75),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            alignSelf: 'center',
            left: 0,
        },
        activeBadgeStyles: {
            color: theme.buttonBg,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        tabItemText: {
            fontSize: 14,
            fontWeight: 600,
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        activeTabItemText: {
            color: theme.buttonBg,
        },
    };
});

type Props = {
    draftsCount: number;
    scheduledPostCount: number;
    initialTab: number;
}

export function DraftTabsHeader({draftsCount, scheduledPostCount, initialTab}: Props) {
    const [selectedTab, setSelectedTab] = useState(initialTab);

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const draftCountBadge = useMemo(() => {
        // eslint-disable-next-line no-warning-comments
        // TODO: when integrating with database, handle here the case of draft count being 0, and return undefined

        // change style depending on whether this tab is the active tab or not
        const style = selectedTab === DRAFT_TAB_INDEX ? {...styles.badgeStyles, ...styles.activeBadgeStyles} : styles.badgeStyles;

        return (
            <Badge
                value={draftsCount}
                visible={true}
                style={style}
            />
        );
    }, [initialTab, draftsCount, styles.activeBadgeStyles, styles.badgeStyles]);

    const scheduledPostCountBadge = useMemo(() => {
        // eslint-disable-next-line no-warning-comments
        // TODO: when integrating with database, handle here the case of scheduled post count being 0, and return undefined

        // change style depending on whether this tab is the active tab or not
        const style = selectedTab === SCHEDULED_POSTS_TAB_INDEX ? {...styles.badgeStyles, ...styles.activeBadgeStyles} : styles.badgeStyles;

        return (
            <Badge
                value={scheduledPostCount}
                visible={true}
                style={style}
            />
        );
    }, [initialTab, scheduledPostCount, styles.activeBadgeStyles, styles.badgeStyles]);

    return (
        <View style={styles.tabContainer}>
            <Pressable
                style={selectedTab === DRAFT_TAB_INDEX ? {...styles.tab, ...styles.activeTab} : styles.tab}
                onPress={() => setSelectedTab(DRAFT_TAB_INDEX)}
            >
                <Text style={selectedTab === DRAFT_TAB_INDEX ? {...styles.tabItemText, ...styles.activeTabItemText} : styles.tabItemText}>
                    <FormattedMessage
                        id='drafts_tab.title.drafts'
                        defaultMessage='Drafts'
                    />
                </Text>
                {draftCountBadge}
            </Pressable>

            <Pressable
                style={selectedTab === SCHEDULED_POSTS_TAB_INDEX ? {...styles.tab, ...styles.activeTab} : styles.tab}
                onPress={() => setSelectedTab(SCHEDULED_POSTS_TAB_INDEX)}
            >
                <Text style={selectedTab === SCHEDULED_POSTS_TAB_INDEX ? {...styles.tabItemText, ...styles.activeTabItemText} : styles.tabItemText}>
                    <FormattedMessage
                        id='drafts_tab.title.scheduled'
                        defaultMessage='Scheduled'
                    />
                </Text>
                {scheduledPostCountBadge}
            </Pressable>

            {/*<Pressable style={styles.tab}>*/}
            {/*    <View>*/}
            {/*        <Text>{'Hello'}</Text>*/}
            {/*    </View>*/}
            {/*</Pressable>*/}

            {/*<Pressable style={styles.tab}>*/}
            {/*    <View >*/}
            {/*        <Text>{'World'}</Text>*/}
            {/*    </View>*/}
            {/*</Pressable>*/}
        </View>
    );
}
