// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {Tab, TabView} from '@rneui/base';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Text, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import Badge from '@components/badge';
import NavigationHeader from '@components/navigation_header';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {popTopScreen} from '../navigation';

import GlobalDraftsList from './components/global_drafts_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {AvailableScreens} from '@typings/screens/navigation';

const edges: Edge[] = ['left', 'right'];

export const DRAFT_SCREEN_TAB_DRAFTS = 0;
export const DRAFT_SCREEN_TAB_SCHEDULED_POSTS = 1;
export type DraftScreenTab = typeof DRAFT_SCREEN_TAB_DRAFTS | typeof DRAFT_SCREEN_TAB_SCHEDULED_POSTS;

type Props = {
    componentId?: AvailableScreens;
    scheduledPostsEnabled?: boolean;
    initialTab?: DraftScreenTab;
};

const DRAFT_TAB_INDEX = 0;
const SCHEDULED_POSTS_TAB_INDEX = 1;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        tabItem: {
            position: 'relative',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        activeTabItem: {
            color: theme.buttonBg,
        },
        tabItemText: {
            fontSize: 14,
            fontWeight: 600,
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        activeTabItemText: {
            color: theme.buttonBg,
        },
        tabItemTextActive: {
            color: theme.buttonBg,
        },
        activeTabIndicator: {
            backgroundColor: theme.buttonBg,
        },
        badgeStyles: {
            position: 'relative',
            color: changeOpacity(theme.centerChannelColor, 0.75),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        activeBadgeStyles: {
            color: theme.buttonBg,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        badgeStylesActive: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        tabView: {
            width: '100%',
        },
    };
});

const GlobalDraftsAndScheduledPosts = ({componentId, scheduledPostsEnabled, initialTab}: Props) => {
    const [tabIndex, setTabIndex] = React.useState(initialTab || DRAFT_SCREEN_TAB_DRAFTS);

    // eslint-disable-next-line no-warning-comments
    // TODO: replace this hardcoded count with actual count integrated from the database
    const draftsCount = 10;

    // eslint-disable-next-line no-warning-comments
    // TODO: replace this hardcoded count with actual count integrated from the database
    const scheduledPostCount = 100;

    const intl = useIntl();
    const switchingTeam = useTeamSwitch();
    const isTablet = useIsTablet();

    const defaultHeight = useDefaultHeaderHeight();

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const headerLeftComponent = useMemo(() => {
        if (isTablet) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={Screens.GLOBAL_DRAFTS}/>);
    }, [isTablet]);

    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight;
        return {flex: 1, marginTop};
    }, [defaultHeight]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        if (!isTablet) {
            popTopScreen(componentId);
        }
    }, [componentId, isTablet]);

    const draftCountBadge = useMemo(() => {
        // eslint-disable-next-line no-warning-comments
        // TODO: when integrating with database, handle here the case of draft count being 0, and return undefined

        // change style depending on whether this tab is the active tab or not
        const style = tabIndex === DRAFT_TAB_INDEX ? {...styles.badgeStyles, ...styles.activeBadgeStyles} : styles.badgeStyles;

        return (
            <Badge
                value={draftsCount}
                visible={true}
                style={style}
            />
        );
    }, [tabIndex, styles.activeBadgeStyles, styles.badgeStyles]);

    const scheduledPostCountBadge = useMemo(() => {
        // eslint-disable-next-line no-warning-comments
        // TODO: when integrating with database, handle here the case of scheduled post count being 0, and return undefined

        // change style depending on whether this tab is the active tab or not
        const style = tabIndex === SCHEDULED_POSTS_TAB_INDEX ? {...styles.badgeStyles, ...styles.activeBadgeStyles} : styles.badgeStyles;

        return (
            <Badge
                value={scheduledPostCount}
                visible={true}
                style={style}
            />
        );
    }, []);

    const tabStyle = (active: boolean) => {
        if (active) {
            return {
                ...styles.tabItemText,
                ...styles.activeTabItemText,
            };
        }
        return styles.tabItemText;
    };

    return (
        <SafeAreaView
            edges={edges}
            mode='margin'
            style={styles.flex}
            testID='global_drafts.screen'
        >
            <NavigationHeader
                showBackButton={!isTablet}
                isLargeTitle={false}
                onBackPress={onBackPress}
                title={
                    intl.formatMessage({
                        id: 'drafts',
                        defaultMessage: 'Drafts',
                    })
                }
                leftComponent={headerLeftComponent}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
            {!switchingTeam &&
            <View style={containerStyle}>
                {
                    scheduledPostsEnabled ? (
                        <>
                            <Tab
                                value={tabIndex}
                                onChange={(e) => setTabIndex(e)}
                                indicatorStyle={styles.activeTabIndicator}
                            >
                                <Tab.Item
                                    title={intl.formatMessage({id: 'drafts_tab.title.drafts', defaultMessage: 'Drafts'})}
                                    style={styles.tabItem}
                                    titleStyle={tabStyle}
                                    icon={draftCountBadge}
                                    iconPosition='right'
                                    active={tabIndex === DRAFT_TAB_INDEX}
                                />
                                <Tab.Item
                                    title={intl.formatMessage({id: 'drafts_tab.title.scheduled', defaultMessage: 'Scheduled'})}
                                    style={styles.tabItem}
                                    titleStyle={tabStyle}
                                    icon={scheduledPostCountBadge}
                                    iconPosition='right'
                                    active={tabIndex === SCHEDULED_POSTS_TAB_INDEX}
                                />
                            </Tab>

                            <TabView
                                value={tabIndex}
                                onChange={setTabIndex}
                                disableSwipe={true}
                            >
                                <TabView.Item style={styles.tabView}>
                                    <GlobalDraftsList
                                        location={Screens.GLOBAL_DRAFTS}
                                    />
                                </TabView.Item>
                                <TabView.Item style={styles.tabView}>
                                    {/*Render scheduled post list here*/}
                                    <Text>{'Favorite'}</Text>
                                </TabView.Item>
                            </TabView>
                        </>
                    ) : (
                        <GlobalDraftsList
                            location={Screens.GLOBAL_DRAFTS}
                        />
                    )
                }
            </View>
            }
        </SafeAreaView>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const scheduledPostsEnabled = observeConfigBooleanValue(database, 'ScheduledPosts');
    return {
        scheduledPostsEnabled,
    };
});

export default withDatabase(enhanced(GlobalDraftsAndScheduledPosts));
