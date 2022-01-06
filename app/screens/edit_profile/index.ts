// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {WithDatabaseArgs} from '@typings/database/database';
import SystemModel from '@typings/database/models/servers/system';
import UserModel from '@typings/database/models/servers/user';

import EditProfile from './edit_profile';

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);

    return {
        currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
            switchMap(
                (id) => database.get<UserModel>(USER).findAndObserve(id.value),
            ),
        ),
        lockedFirstName: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapFirstNameAttributeSet === 'true' || value.SamlFirstNameAttributeSet === 'true'),
            ),
        ),
        lockedLastName: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapLastNameAttributeSet === 'true' || value.SamlLastNameAttributeSet === 'true'),
            ),
        ),
        lockedNickname: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapNicknameAttributeSet === 'true' || value.SamlNicknameAttributeSet === 'true'),
            ),
        ),
        lockedPosition: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapPositionAttributeSet === 'true' || value.SamlPositionAttributeSet === 'true'),
            ),
        ),
        lockedPicture: config.pipe(
            switchMap(
                ({value}: {value: ClientConfig}) => of$(value.LdapPictureAttributeSet === 'true'),
            ),
        ),
    };
});

export default withDatabase(enhanced(EditProfile));
