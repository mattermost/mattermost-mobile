// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import compose from 'lodash/fp/compose';
import groupBy from 'lodash/groupBy';
import moment from 'moment-timezone';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {SectionList} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {switchMap} from 'rxjs';

import {getRecentMentions} from '@actions/remote/search';
import DateSeparator from '@app/components/post_list/date_separator';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {RecentMentionsModel, SystemModel, UserModel} from '@app/database/models/server';
import NavigationHeader from '@components/navigation_header';
import {LARGE_HEADER_PROGRESSVIEW_OFFSET} from '@constants/view';
import {useServerUrl} from '@context/server_url';
import {withTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';

import Mention from './components/mention';

import type {WithDatabaseArgs} from '@typings/database/database';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const {RECENT_MENTIONS, USER, SYSTEM} = MM_TABLES.SERVER;

type Props = {
    mentions: RecentMentionsModel[];
    theme: Theme;
    currentUser: UserModel;
}

type Section = {
    key: string;
    title: string;
    data: RecentMentionsModel[];
    keyExtractor: (item: RecentMentionsModel) => string;
}

function getSections(items: RecentMentionsModel[]) {
    const groups = groupBy(items, (mention) => {
        return moment(mention.updateAt).startOf('day').format();
    });

    const sections: Section[] = Object.keys(groups).map((key) => ({
        key: String(key),
        title: String(key),
        data: groups[key],
        keyExtractor: (item: RecentMentionsModel) => item.id,
    }));

    return sections.sort((a, b) => (a.title > b.title ? -1 : 1));
}

const RecentMentionsScreen = ({mentions, theme, currentUser}: Props) => {
    const [refreshing, setRefreshing] = useState(false);
    const searchScreenIndex = 1;

    const subtitle = 'Messages you\'ve been mentioned in';
    const title = 'Recent Mentions';
    const isLargeTitle = true;
    const isFocused = useIsFocused();
    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<SectionList<string>>(isLargeTitle, Boolean(subtitle), false);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, paddingBottom: 10}), [scrollPaddingTop]);

    const serverUrl = useServerUrl();
    const sections = useMemo(() => getSections(mentions), [mentions]);

    useEffect(() => {
        getRecentMentions(serverUrl);
    }, [serverUrl]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await getRecentMentions(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    const nav = useNavigation();
    const stateIndex = nav.getState().index;

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],
        };
    }, [isFocused, stateIndex]);

    return (
        <>
            <NavigationHeader
                isLargeTitle={isLargeTitle}
                showBackButton={false}
                subtitle={subtitle}
                title={title}
                hasSearch={false}
                scrollValue={scrollValue}
                forwardedRef={scrollRef}
            />
            <SafeAreaView
                style={{flex: 1}}
                edges={['bottom', 'left', 'right']}
            >
                <Animated.View style={[{flex: 1}, animated]}>
                    <AnimatedSectionList
                        ref={scrollRef}
                        contentContainerStyle={paddingTop}
                        sections={sections}
                        scrollToOverflowEnabled={true}
                        showsVerticalScrollIndicator={false}
                        progressViewOffset={LARGE_HEADER_PROGRESSVIEW_OFFSET}
                        scrollEventThrottle={16}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                        renderItem={({item}) => (
                            <Mention
                                currentUser={currentUser}
                                mention={item}
                                theme={theme}
                            />
                        )}
                        renderSectionHeader={({section: {title: date}}: {section: Section}) => (
                            <DateSeparator
                                date={new Date(date)}
                                theme={theme}
                            />
                        )}
                    />
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

const enhance = withObservables([], ({database}: WithDatabaseArgs) => ({
    mentions: database.get(RECENT_MENTIONS).query(),
    currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    ),
}));

export default compose(
    withDatabase,
    withTheme,
    enhance,
)(RecentMentionsScreen);
