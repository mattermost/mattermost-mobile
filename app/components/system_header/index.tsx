// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {View} from 'react-native';
import {map, switchMap} from 'rxjs/operators';

import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    createAt: number | string | Date;
    isMilitaryTime: boolean;
    isTimezoneEnabled: boolean;
    theme: Theme;
    user: UserModel;
}

const {SERVER: {PREFERENCE, SYSTEM, USER}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        displayName: {
            color: theme.centerChannelColor,
            flexGrow: 1,
            ...typography('Body', 200, 'SemiBold'),
        },
        displayNameContainer: {
            maxWidth: '60%',
            marginRight: 5,
        },
        header: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 10,
        },
        time: {
            color: theme.centerChannelColor,
            marginTop: 5,
            opacity: 0.5,
            flex: 1,
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const SystemHeader = ({isMilitaryTime, isTimezoneEnabled, createAt, theme, user}: Props) => {
    const styles = getStyleSheet(theme);
    const userTimezone = isTimezoneEnabled ? getUserTimezone(user) : '';

    return (
        <View style={styles.header}>
            <View style={styles.displayNameContainer}>
                <FormattedText
                    id='post_info.system'
                    defaultMessage='System'
                    style={styles.displayName}
                    testID='post_header.display_name'
                />
            </View>
            <FormattedTime
                timezone={userTimezone!}
                isMilitaryTime={isMilitaryTime}
                value={createAt}
                style={styles.time}
                testID='post_header.date_time'
            />
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);
    const preferences = database.get<PreferenceModel>(PREFERENCE).query(
        Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS), Q.where('name', 'use_military_time'),
    ).observe();
    const isTimezoneEnabled = config.pipe(map(({value}: {value: ClientConfig}) => value.ExperimentalTimezone === 'true'));
    const isMilitaryTime = preferences.pipe(
        map((prefs) => getPreferenceAsBool(prefs, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)),
    );
    const user = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get(USER).findAndObserve(value)),
    );

    return {
        isMilitaryTime,
        isTimezoneEnabled,
        user,
    };
});

export default withDatabase(enhanced(SystemHeader));
