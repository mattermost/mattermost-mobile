// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useIsFocused, useRoute} from '@react-navigation/native';
import compose from 'lodash/fp/compose';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View, ActivityIndicator, FlatList} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {getRecentMentions} from '@actions/remote/search';
import DateSeparator from '@app/components/post_list/date_separator';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {SystemModel, UserModel} from '@app/database/models/server';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@app/utils/post_list';
import {getTimezone} from '@app/utils/user';
import NavigationHeader from '@components/navigation_header';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';

import Mention from './components/mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const {USER, SYSTEM, POST} = MM_TABLES.SERVER;

type Props = {
    currentTimezone: string | null;
    currentUser: UserModel;
    isTimezoneEnabled: boolean;
    mentions: PostModel[];
    theme: Theme;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    loading: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});

const RecentMentionsScreen = ({mentions, currentUser, currentTimezone, isTimezoneEnabled}: Props) => {
    const theme = useTheme();
    const route = useRoute();
    const isFocused = useIsFocused();
    const {formatMessage} = useIntl();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const serverUrl = useServerUrl();

    const params = route.params! as {direction: string};
    const toLeft = params.direction === 'left';

    const title = formatMessage({id: 'screen.mentions.title', defaultMessage: 'Recent Mentions'});
    const subtitle = formatMessage({id: 'screen.mentions.subtitle', defaultMessage: 'Messages you\'ve been mentioned in'});
    const isLargeTitle = true;

    useEffect(() => {
        setLoading(true);
        getRecentMentions(serverUrl).finally(() => {
            setLoading(false);
        });
    }, [serverUrl]);

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<FlatList<string>>(isLargeTitle, Boolean(subtitle), false);

    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, paddingBottom: 10}), [scrollPaddingTop]);

    const posts = useMemo(() => selectOrderedPosts(mentions, 0, false, '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [mentions]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await getRecentMentions(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(toLeft ? -25 : 25, {duration: 150})}],
        };
    }, [isFocused]);

    const renderItem = useCallback(({item}) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            }
            return null;
        }

        return (
            <Mention
                currentUser={currentUser}
                post={item}
            />
        );
    }, [currentUser]);

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
                style={styles.flex}
                edges={['bottom', 'left', 'right']}
            >
                <Animated.View style={[styles.flex, animated]}>
                    {loading && !mentions.length ? (
                        <View style={styles.loading}>
                            <ActivityIndicator
                                color={theme.sidebarBg}
                                size='large'
                            />
                        </View>
                    ) : (
                        <AnimatedFlatList
                            ref={scrollRef}
                            contentContainerStyle={paddingTop}
                            data={posts}
                            scrollToOverflowEnabled={true}
                            showsVerticalScrollIndicator={false}
                            progressViewOffset={scrollPaddingTop}
                            scrollEventThrottle={16}
                            indicatorStyle='black'
                            onScroll={onScroll}
                            onRefresh={handleRefresh}
                            refreshing={refreshing}
                            renderItem={renderItem}
                        />
                    )}
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    );

    return {
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
                    Q.sortBy('create_at', Q.asc),
                ).observe();
            }),
        ),
        currentUser,
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user.timezone))))),
        isTimezoneEnabled: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config) => of$(config.value.ExperimentalTimezone === 'true')),
        ),
    };
});

export default compose(
    withDatabase,
    enhance,
)(RecentMentionsScreen);
