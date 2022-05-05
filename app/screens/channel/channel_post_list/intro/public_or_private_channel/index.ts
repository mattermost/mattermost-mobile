// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfig, observeLicense} from '@queries/servers/system';
import {observeCurrentUser, observeUser} from '@queries/servers/user';
import {displayUsername} from '@utils/user';

import PublicOrPrivateChannel from './public_or_private_channel';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

const enhanced = withObservables([], ({channel, database}: {channel: ChannelModel} & WithDatabaseArgs) => {
    let creator;
    if (channel.creatorId) {
        const config = observeConfig(database);
        const license = observeLicense(database);
        const preferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).
            observeWithColumns(['value']);
        const me = observeCurrentUser(database);
        const profile = observeUser(database, channel.creatorId);

        const teammateNameDisplay = combineLatest([preferences, config, license]).pipe(
            map(([prefs, cfg, lcs]) => getTeammateNameDisplaySetting(prefs, cfg, lcs)),
        );

        creator = combineLatest([profile, teammateNameDisplay, me]).pipe(
            map(([user, displaySetting, currentUser]) => (user ? displayUsername(user, currentUser?.locale, displaySetting, true) : '')),
        );
    } else {
        creator = of$(undefined);
    }

    return {
        creator,
    };
});

export default withDatabase(enhanced(PublicOrPrivateChannel));
