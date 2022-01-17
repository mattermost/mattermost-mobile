// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {switchToChannelById} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {General} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type SystemModel from '@typings/database/models/servers/system';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: theme.sidebarText,
    },
    text: {
        color: theme.sidebarText,
        paddingLeft: 12,
    },
}));

const textStyle = StyleSheet.create([typography('Body', 200, 'SemiBold')]);

const ThreadsButton = ({channelId}: {channelId?: string}) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    /*
     * @to-do:
     * - Check if there are threads, else return null (think of doing this before mounting this component)
     * - Change to button, navigate to threads view instead of the current team Town Square
     * - Add right-side number badge
     */
    return (
        <TouchableWithFeedback onPress={() => (channelId ? switchToChannelById(serverUrl, channelId) : true)} >
            <View style={styles.container}>
                <CompassIcon
                    name='message-text-outline'
                    style={styles.icon}
                />
                <Text style={[textStyle, styles.text]}>{'Threads'}</Text>
            </View>
        </TouchableWithFeedback>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID);
    const channelId = currentTeamId.pipe(
        switchMap((model) => database.get<ChannelModel>(MM_TABLES.SERVER.CHANNEL).query(
            Q.where('team_id', model.value),
            Q.where('name', General.DEFAULT_CHANNEL),
        ).observe().pipe(
            // eslint-disable-next-line max-nested-callbacks
            switchMap((channels) => (channels.length ? of$(channels[0].id) : of$(undefined))),
        )),
    );

    return {channelId};
});

export default withDatabase(enhanced(ThreadsButton));
