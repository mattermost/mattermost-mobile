// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import compose from 'lodash/fp/compose';
import groupBy from 'lodash/groupBy';
import moment from 'moment-timezone';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View, ActivityIndicator, SectionList, SectionListRenderItemInfo} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {of as of$, map as map$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {getRecentMentions} from '@actions/remote/search';
import DateSeparator from '@app/components/post_list/date_separator';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {SystemModel, UserModel} from '@app/database/models/server';
import NavigationHeader from '@components/navigation_header';
import {LARGE_HEADER_PROGRESSVIEW_OFFSET} from '@constants/view';
import {useServerUrl} from '@context/server_url';
import {withTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';

import Mention from './components/mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const {USER, SYSTEM, POST} = MM_TABLES.SERVER;

type Props = {
    mentions: PostModel[];
    theme: Theme;
    currentUser: UserModel;
}

type Section = {
    key: string;
    title: string;
    data: PostModel[];
    keyExtractor: (item: PostModel) => string;
}

const styles = StyleSheet.create({
    loading: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});

function getSections(items: PostModel[]) {
    const groups = groupBy(items, (mention) => {
        return moment(mention.createAt).startOf('day').format();
    });

    const sections: Section[] = Object.keys(groups).map((key) => ({
        key: String(key),
        title: String(key),
        data: groups[key],
        keyExtractor: (item: PostModel) => item.id,
    }));

    return sections.sort((a, b) => (a.title > b.title ? -1 : 1));
}

const RecentMentionsScreen = ({mentions, theme, currentUser}: Props) => {
    const {formatMessage} = useIntl();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const searchScreenIndex = 1;

    const subtitle = formatMessage({id: 'screen.mentions.subtitle', defaultMessage: 'Messages you\'ve been mentioned in'});
    const title = formatMessage({id: 'screen.mentions.title', defaultMessage: 'Recent Mentions'});
    const isLargeTitle = true;
    const isFocused = useIsFocused();
    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<SectionList<string>>(isLargeTitle, Boolean(subtitle), false);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, paddingBottom: 10}), [scrollPaddingTop]);

    const serverUrl = useServerUrl();
    const sections = useMemo(() => getSections(mentions), [mentions]);

    useEffect(() => {
        setLoading(true);
        getRecentMentions(serverUrl).finally(() => {
            setLoading(false);
        });
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

    const renderItem = useCallback(({item}: SectionListRenderItemInfo<PostModel>) => (
        <Mention
            currentUser={currentUser}
            post={item}
            theme={theme}
        />
    ), [theme, currentUser]);

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
                    {loading && !mentions.length ? (
                        <View style={styles.loading}>
                            <ActivityIndicator
                                color={theme.sidebarBg}
                                size='large'
                            />
                        </View>
                    ) : (
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
                            renderItem={renderItem}
                            renderSectionHeader={({section: {title: date}}: {section: Section}) => (
                                <DateSeparator
                                    date={new Date(date)}
                                    theme={theme}
                                />
                            )}
                        />
                    )}
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

const enhance = withObservables([], ({database}: WithDatabaseArgs) => ({
    mentions: database.get<SystemModel>(SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.RECENT_MENTIONS),
        Q.take(1),
    ).observeWithColumns(['value']).pipe(
        switchMap((rows) => {
            if (!rows.length || !rows[0].value.length) {
                return of$([]);
            }
            const row = rows[0];
            return database.get(POST).query(
                Q.where('id', Q.oneOf(row.value)),
                Q.sortBy('create_at', Q.desc),
            ).observe();
        }),
        catchError(() => of$([])),
    ),
    currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        map$((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    ),
}));

export default compose(
    withDatabase,
    enhance,
    withTheme,
)(RecentMentionsScreen);
