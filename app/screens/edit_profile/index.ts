// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import EditProfile from './edit_profile';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);

    return {
        currentUser: observeCurrentUser(database),
        lockedFirstName: config.pipe(
            switchMap(
                (cfg) => of$(cfg?.LdapFirstNameAttributeSet === 'true' || cfg?.SamlFirstNameAttributeSet === 'true'),
            ),
        ),
        lockedLastName: config.pipe(
            switchMap(
                (cfg) => of$(cfg?.LdapLastNameAttributeSet === 'true' || cfg?.SamlLastNameAttributeSet === 'true'),
            ),
        ),
        lockedNickname: config.pipe(
            switchMap(
                (cfg) => of$(cfg?.LdapNicknameAttributeSet === 'true' || cfg?.SamlNicknameAttributeSet === 'true'),
            ),
        ),
        lockedPosition: config.pipe(
            switchMap(
                (cfg) => of$(cfg?.LdapPositionAttributeSet === 'true' || cfg?.SamlPositionAttributeSet === 'true'),
            ),
        ),
        lockedPicture: config.pipe(
            switchMap(
                (cfg) => of$(cfg?.LdapPictureAttributeSet === 'true'),
            ),
        ),
    };
});

export default withDatabase(enhanced(EditProfile));
