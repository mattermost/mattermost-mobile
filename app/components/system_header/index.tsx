// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {View} from 'react-native';
import {of as of$} from 'rxjs';

import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getUserTimezone} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type withUserInputProps = {
    config: SystemModel;
    currentUserId: SystemModel;
    preferences: PreferenceModel[];
}

type Props = {
    createAt: number | string | Date;
    isMilitaryTime: boolean;
    isTimezoneEnabled: boolean;
    theme: Theme;
    user: UserModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontFamily: 'OpenSans-Semibold',
            flexGrow: 1,
            paddingVertical: 2,
        },
        displayNameContainer: {
            maxWidth: '60%',
            marginRight: 5,
            marginBottom: 3,
        },
        header: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 10,
        },
        time: {
            color: theme.centerChannelColor,
            fontSize: 12,
            marginTop: 5,
            opacity: 0.5,
            flex: 1,
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

const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
    currentUserId: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID),
    preferences: database.get(MM_TABLES.SERVER.PREFERENCE).query(
        Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS), Q.where('name', 'use_military_time'),
    ).observe(),
}));

const withUser = withObservables(['currentUserId'], ({config, currentUserId, database, preferences}: WithDatabaseArgs & withUserInputProps) => {
    const cfg: ClientConfig = config.value;
    const isTimezoneEnabled = of$(cfg.ExperimentalTimezone === 'true');
    const isMilitaryTime = of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false));

    return {
        isMilitaryTime,
        isTimezoneEnabled,
        user: database.get(MM_TABLES.SERVER.USER).findAndObserve(currentUserId.value),
    };
});

export default withDatabase(withSystemIds(withUser(React.memo(SystemHeader))));
