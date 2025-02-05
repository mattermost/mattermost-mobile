// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Tab, TabView} from '@rneui/base';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import NavigationHeader from '@components/navigation_header';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {popTopScreen} from '../navigation';

import GlobalDraftsList from './components/global_drafts_list';

import type {AvailableScreens} from '@typings/screens/navigation';
import Badge from '@components/badge';

const edges: Edge[] = ['left', 'right'];

type Props = {
    componentId?: AvailableScreens;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        tabItem: {
            position: 'relative',
        },
        tabItemText: {
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        activeTabIndicator: {
            backgroundColor: theme.buttonBg,
        },
        badgeStyles: {
            position: 'relative',
            backgroundColor: 'red',
        },
    };
});

const GlobalDraftsAndScheduledPosts = ({componentId}: Props) => {
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

    const draftCountBadge = useMemo(() => {
        if (draftsCount === 0) {
            return undefined;
        }

        return (
            <Badge
                value={draftsCount}
                visible={true}
                style={styles.badgeStyles}
            />
        );
    }, [styles.badgeStyles]);

    const scheduledPostCountBadge = useMemo(() => {
        if (scheduledPostCount === 0) {
            return undefined;
        }

        return (
            <Badge
                value={scheduledPostCount}
                visible={true}
                style={styles.badgeStyles}
            />
        );
    }, [styles.badgeStyles]);

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
                <Tab
                    value={index}
                    onChange={(e) => setIndex(e)}
                    indicatorStyle={styles.activeTabIndicator}
                >
                    <Tab.Item
                        title={intl.formatMessage({id: 'drafts_tab.title.drafts', defaultMessage: 'Drafts'})}
                        style={styles.tabItem}
                        titleStyle={styles.tabItemText}
                        icon={draftCountBadge}
                        iconPosition='right'
                    />
                    <Tab.Item
                        title={intl.formatMessage({id: 'drafts_tab.title.scheduled', defaultMessage: 'Scheduled'})}
                        style={styles.tabItem}
                        titleStyle={styles.tabItemText}
                        icon={scheduledPostCountBadge}
                        iconPosition='right'
                    />
                </Tab>

                <TabView
                    value={index}
                    onChange={setIndex}
                    animationType='spring'
                >
                    <TabView.Item>
                        <GlobalDraftsList
                            location={Screens.GLOBAL_DRAFTS_AND_SCHEDULED_POSTS}
                        />
                    </TabView.Item>
                    <TabView.Item>
                        <Text>{'Favorite'}</Text>
                    </TabView.Item>
                </TabView>
            </View>
            }
        </SafeAreaView>
    );
};

export default GlobalDraftsAndScheduledPosts;
