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

type Props = {
    componentId?: AvailableScreens;
    scheduledPostsEnabled?: boolean;
};

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

const GlobalDraftsAndScheduledPosts = ({componentId, scheduledPostsEnabled}: Props) => {
    const [index, setIndex] = React.useState(0);

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

        return (<OtherMentionsBadge channelId={Screens.GLOBAL_DRAFTS_AND_SCHEDULED_POSTS}/>);
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

    const draftCountBadge = (i: number) => {
        if (draftsCount === 0) {
            return undefined;
        }

        const style = i === index ? {...styles.badgeStyles, ...styles.activeBadgeStyles} : styles.badgeStyles;

        return (
            <Badge
                value={draftsCount}
                visible={true}
                style={style}
            />
        );
    };

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
                                value={index}
                                onChange={(e) => setIndex(e)}
                                indicatorStyle={styles.activeTabIndicator}
                            >
                                <Tab.Item
                                    title={intl.formatMessage({id: 'drafts_tab.title.drafts', defaultMessage: 'Drafts'})}
                                    style={styles.tabItem}
                                    titleStyle={tabStyle}
                                    icon={draftCountBadge(0)}
                                    iconPosition='right'
                                    active={index === 0}
                                />
                                <Tab.Item
                                    title={intl.formatMessage({id: 'drafts_tab.title.scheduled', defaultMessage: 'Scheduled'})}
                                    icon={draftCountBadge(1)}
                                    iconPosition='right'
                                    style={styles.tabItem}
                                    titleStyle={tabStyle}
                                    active={index === 1}
                                />
                            </Tab>

                            <TabView
                                value={index}
                                onChange={setIndex}
                                disableSwipe={true}
                            >
                                <TabView.Item style={styles.tabView}>
                                    <GlobalDraftsList
                                        location={Screens.GLOBAL_DRAFTS_AND_SCHEDULED_POSTS}
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
                            location={Screens.GLOBAL_DRAFTS_AND_SCHEDULED_POSTS}
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
