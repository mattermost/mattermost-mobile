// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, DeviceEventEmitter, FlatList, StyleSheet, View} from 'react-native';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchSavedPosts} from '@actions/remote/post';
import Loading from '@components/loading';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import TabletTitle from '@components/tablet_title';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isDateLine, getDateForDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './components/empty';

import type {ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    componentId?: string;
    closeButtonId?: string;
    currentTimezone: string | null;
    isTimezoneEnabled: boolean;
    isTablet?: boolean;
    posts: PostModel[];
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    list: {
        paddingVertical: 8,
    },
    loading: {
        height: 40,
        width: 40,
        justifyContent: 'center' as const,
    },
});

function SavedMessages({
    componentId,
    closeButtonId,
    posts,
    currentTimezone,
    isTimezoneEnabled,
    isTablet,
}: Props) {
    const intl = useIntl();
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const close = () => {
        if (componentId) {
            dismissModal({componentId});
        }
    };

    useEffect(() => {
        fetchSavedPosts(serverUrl).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        let unsubscribe: EventSubscription | undefined;
        if (componentId && closeButtonId) {
            unsubscribe = Navigation.events().registerComponentListener({
                navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                    switch (buttonId) {
                        case closeButtonId:
                            close();
                            break;
                    }
                },
            }, componentId);
        }

        return () => {
            unsubscribe?.remove();
        };
    }, [componentId, closeButtonId]);

    useEffect(() => {
        let listener: EventSubscription|undefined;
        if (!isTablet && componentId) {
            listener = BackHandler.addEventListener('hardwareBackPress', () => {
                if (EphemeralStore.getNavigationTopComponentId() === componentId) {
                    close();
                    return true;
                }

                return false;
            });
        }

        return () => listener?.remove();
    }, [componentId, isTablet]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable) {
                acc[`${Screens.SAVED_POSTS}-${item.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchSavedPosts(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    const emptyList = useMemo(() => (
        <View style={styles.empty}>
            {loading ? (
                <Loading
                    color={theme.buttonBg}
                    size='large'
                />
            ) : (
                <EmptyState/>
            )}
        </View>
    ), [loading, theme.buttonBg]);

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
            <PostWithChannelInfo
                location={Screens.SAVED_POSTS}
                post={item}
            />
        );
    }, [currentTimezone, isTimezoneEnabled, theme]);

    return (
        <>
            {isTablet &&
            <TabletTitle
                testID='custom_status.done.button'
                title={intl.formatMessage({id: 'mobile.screen.saved_posts', defaultMessage: 'Saved Messages'})}
            />
            }
            <SafeAreaView
                edges={edges}
                style={styles.flex}
            >
                <FlatList
                    contentContainerStyle={data.length ? styles.list : [styles.empty]}
                    ListEmptyComponent={emptyList}
                    data={data}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    renderItem={renderItem}
                    scrollToOverflowEnabled={true}
                    onViewableItemsChanged={onViewableItemsChanged}
                />
            </SafeAreaView>
        </>
    );
}

export default SavedMessages;
