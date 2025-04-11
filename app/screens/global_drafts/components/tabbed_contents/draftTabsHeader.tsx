// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import Badge from '@components/badge';
import FormattedText from '@components/formatted_text';
import {DRAFT_SCREEN_TAB_SCHEDULED_POSTS, type DraftScreenTab} from '@constants/draft';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const DRAFT_TAB_INDEX = 0;
const SCHEDULED_POSTS_TAB_INDEX = 1;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        tabContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
        },
        menuContainer: {
            alignItems: 'center',
            flexGrow: 1,
            flexDirection: 'row',
            paddingLeft: 12,
            marginVertical: 12,
            flex: 1,
            overflow: 'hidden',
        },
        menuItemContainer: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
        },
        menuItemContainerSelected: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
            flexDirection: 'row',
        },
        menuItem: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            alignSelf: 'center',
            ...typography('Body', 200, 'SemiBold'),
        },
        menuItemSelected: {
            color: theme.buttonBg,
        },
        badgeStyles: {
            position: 'relative',
            color: changeOpacity(theme.centerChannelColor, 0.75),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            alignSelf: 'center',
            left: 4,
            top: 1,
            borderWidth: 0,
            paddingTop: 2,
        },
        activeBadgeStyles: {
            color: theme.buttonBg,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
    };
});

type Props = {
    draftsCount: number;
    scheduledPostCount: number;
    selectedTab: DraftScreenTab;
    onTabChange: (tab: DraftScreenTab) => void;
}

export function DraftTabsHeader({draftsCount, scheduledPostCount, selectedTab, onTabChange}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const viewingDrafts = selectedTab === DRAFT_TAB_INDEX;

    const draftCountBadge = () => {
        const style = [styles.badgeStyles, selectedTab === DRAFT_TAB_INDEX ? styles.activeBadgeStyles : null];

        return (
            <Badge
                value={draftsCount}
                visible={draftsCount !== 0}
                style={style}
                testID='draft_count_badge'
            />
        );
    };

    const scheduledPostCountBadge = () => {
        const style = [styles.badgeStyles, selectedTab === DRAFT_SCREEN_TAB_SCHEDULED_POSTS ? styles.activeBadgeStyles : null];

        return (
            <Badge
                value={scheduledPostCount}
                visible={scheduledPostCount !== 0}
                style={style}
                testID='scheduled_post_count_badge'
            />
        );
    };

    const {draftsContanerStyle, draftsTabStyle, scheduledContainerStyle, scheduledTabStyle} = useMemo(() => {
        return {
            draftsContanerStyle: [
                styles.menuItemContainer,
                viewingDrafts ? styles.menuItemContainerSelected : undefined,
            ],
            draftsTabStyle: [
                styles.menuItem,
                viewingDrafts ? styles.menuItemSelected : undefined,
            ],
            scheduledContainerStyle: [
                styles.menuItemContainer,
                viewingDrafts ? undefined : styles.menuItemContainerSelected,
            ],
            scheduledTabStyle: [
                styles.menuItem,
                viewingDrafts ? undefined : styles.menuItemSelected,
            ],
        };
    }, [styles, viewingDrafts]);

    const onDraftTabPress = usePreventDoubleTap(useCallback(() => {
        onTabChange(DRAFT_TAB_INDEX);
    }, [onTabChange]));

    const onScheduledPostTabPress = usePreventDoubleTap(useCallback(() => {
        onTabChange(SCHEDULED_POSTS_TAB_INDEX);
    }, [onTabChange]));

    return (
        <View
            style={styles.tabContainer}
            testID='draft_tab_container'
        >
            <View style={styles.menuContainer}>
                <TouchableOpacity
                    onPress={onDraftTabPress}
                    testID='draft_tab'
                    accessibilityState={{selected: selectedTab === DRAFT_TAB_INDEX}}
                >
                    <View style={draftsContanerStyle}>
                        <FormattedText
                            id='drafts_tab.title.drafts'
                            defaultMessage='Drafts'
                            style={draftsTabStyle}
                        />
                        {draftCountBadge()}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onScheduledPostTabPress}
                    testID='scheduled_post_tab'
                    accessibilityState={{selected: selectedTab === DRAFT_SCREEN_TAB_SCHEDULED_POSTS}}
                >
                    <View style={scheduledContainerStyle}>
                        <FormattedText
                            id='drafts_tab.title.scheduled'
                            defaultMessage='Scheduled'
                            style={scheduledTabStyle}
                        />
                        {scheduledPostCountBadge()}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}
