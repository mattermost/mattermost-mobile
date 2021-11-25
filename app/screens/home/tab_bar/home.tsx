// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {MM_TABLES} from '@constants/database';
import {BOTTOM_TAB_ICON_SIZE} from '@constants/view';
import DatabaseManager from '@database/manager';
import {changeOpacity} from '@utils/theme';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {Subscription} from 'rxjs';

type Props = {
    isFocused: boolean;
    theme: Theme;
}

type UnreadMessages = {
    mentions: number;
    messages: number;
};

type UnreadSubscription = UnreadMessages & {
    subscription?: Subscription;
}

const {SERVERS} = MM_TABLES.APP;
const {CHANNEL, MY_CHANNEL} = MM_TABLES.SERVER;
const subscriptions: Map<string, UnreadSubscription> = new Map();

const style = StyleSheet.create({
    unread: {
        left: 19,
        top: 4,
    },
    mentionsOneDigit: {
        left: 12,
    },
    mentionsTwoDigits: {
        left: 13,
    },
    mentionsThreeDigits: {
        left: 10,
    },
});

const Home = ({isFocused, theme}: Props) => {
    const db = DatabaseManager.appDatabase?.database;
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, messages: 0});

    const updateTotal = () => {
        let messages = 0;
        let mentions = 0;
        subscriptions.forEach((value) => {
            messages += value.messages;
            mentions += value.mentions;
        });
        setTotal({mentions, messages});
    };

    const unreadsSubscription = (serverUrl: string, myChannels: MyChannelModel[]) => {
        const unreads = subscriptions.get(serverUrl);
        if (unreads) {
            let mentions = 0;
            let messages = 0;
            myChannels.forEach((myChannel) => {
                mentions += myChannel.mentionsCount;
                messages += myChannel.messageCount;
            });

            unreads.mentions = mentions;
            unreads.messages = messages;
            subscriptions.set(serverUrl, unreads);
            updateTotal();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        servers.forEach((server) => {
            const serverUrl = server.url;
            if (server.lastActiveAt) {
                const sdb = DatabaseManager.serverDatabases[serverUrl];
                if (sdb?.database) {
                    if (!subscriptions.has(serverUrl)) {
                        const unreads: UnreadSubscription = {
                            mentions: 0,
                            messages: 0,
                        };
                        subscriptions.set(serverUrl, unreads);
                        unreads.subscription = sdb.database.
                            get(MY_CHANNEL).
                            query(Q.on(CHANNEL, Q.where('delete_at', Q.eq(0)))).
                            observeWithColumns(['mentions_count', 'message_count']).
                            subscribe(unreadsSubscription.bind(undefined, serverUrl));
                    }
                }

                // subscribe and listen for unreads and mentions
            } else if (subscriptions.has(serverUrl)) {
                // logout from server, remove the subscription
                subscriptions.delete(serverUrl);
            }
        });
    };

    useEffect(() => {
        const subscription = db?.
            get(SERVERS).
            query().
            observeWithColumns(['last_active_at']).
            subscribe(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
        };
    }, []);

    let unreadStyle;
    if (total.mentions) {
        unreadStyle = style.mentionsOneDigit;
        if (total.mentions > 9) {
            unreadStyle = style.mentionsTwoDigits;
        } else if (total.mentions > 99) {
            unreadStyle = style.mentionsThreeDigits;
        }
    } else if (total.messages) {
        unreadStyle = style.unread;
    }

    return (
        <View>
            <CompassIcon
                size={BOTTOM_TAB_ICON_SIZE}
                name='home-variant-outline'
                color={isFocused ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.48)}
            />
            <Badge
                backgroundColor={theme.buttonBg}
                borderColor={theme.centerChannelBg}
                color={theme.buttonColor}
                style={unreadStyle}
                visible={!isFocused && Boolean(unreadStyle)}
                type='Small'
                value={total.mentions || (total.messages * -1)}
            />
        </View>
    );
};

export default Home;
