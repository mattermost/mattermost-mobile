// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, StyleSheet, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import NavigationHeader from '@components/navigation_header';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events, Screens} from '@constants';
import {DRAFT_SCREEN_TAB_DRAFTS, type DraftScreenTab} from '@constants/draft';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import TabbedContents from '@screens/global_drafts/components/tabbed_contents';
import {navigateBack} from '@utils/navigation/adapter';

import GlobalDraftsList from './components/global_drafts_list';
import GlobalScheduledPostList from './components/global_scheduled_post_list';

const edges: Edge[] = ['left', 'right'];

type Props = {
    scheduledPostsEnabled?: boolean;
    initialTab?: DraftScreenTab;
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const GlobalDraftsAndScheduledPosts = ({scheduledPostsEnabled, initialTab}: Props) => {
    const intl = useIntl();
    const switchingTeam = useTeamSwitch();
    const isTablet = useIsTablet();
    const defaultHeight = useDefaultHeaderHeight();

    useEffect(() => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, Screens.GLOBAL_DRAFTS);
    }, []);

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
            navigateBack();
        }
    }, [isTablet]);

    const draftList = (
        <GlobalDraftsList
            location={Screens.GLOBAL_DRAFTS}
        />
    );

    const scheduledPostList = useMemo(() => (
        <GlobalScheduledPostList
            location={Screens.GLOBAL_DRAFTS_AND_SCHEDULED_POSTS}
        />
    ), []);

    useAndroidHardwareBackHandler(Screens.GLOBAL_DRAFTS, onBackPress);

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
                        <TabbedContents
                            initialTab={initialTab || DRAFT_SCREEN_TAB_DRAFTS}
                            drafts={draftList}
                            scheduledPosts={scheduledPostList}
                        />
                    ) : draftList
                }
            </View>
            }
        </SafeAreaView>
    );
};

export default GlobalDraftsAndScheduledPosts;
