// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {MM_TABLES} from '@constants/database';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelTitle from './channel_title';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

type ChannelNavBar = {
    channel: ChannelModel;
    onPress: () => void;
}

// Todo: Create common NavBar: See Gekidou & Mobile v2 task Board
const ChannelNavBar = ({channel, onPress}: ChannelNavBar) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            mode='padding'
            style={style.header}
        >
            <ChannelTitle
                channel={channel}
                onPress={onPress}
                canHaveSubtitle={true}
            />
        </SafeAreaView>
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            ...Platform.select({
                android: {
                    elevation: 10,
                    height: 56,
                },
                ios: {
                    zIndex: 10,
                    height: 88,
                },
            }),
        },
    };
});

const withChannel = withObservables(['channelId'], ({channelId, database}: {channelId: string } & WithDatabaseArgs) => ({
    channel: database.get(MM_TABLES.SERVER.CHANNEL).findAndObserve(channelId),
}));

export default withDatabase(withChannel(ChannelNavBar));
