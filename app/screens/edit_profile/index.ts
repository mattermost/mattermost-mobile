// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import EditProfile from './edit_profile';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const ldapFirstNameAttributeSet = observeConfigBooleanValue(database, 'LdapFirstNameAttributeSet');
    const ldapLastNameAttributeSet = observeConfigBooleanValue(database, 'LdapLastNameAttributeSet');
    const ldapNicknameAttributeSet = observeConfigBooleanValue(database, 'LdapNicknameAttributeSet');
    const ldapPositionAttributeSet = observeConfigBooleanValue(database, 'LdapPositionAttributeSet');

    const samlFirstNameAttributeSet = observeConfigBooleanValue(database, 'SamlFirstNameAttributeSet');
    const samlLastNameAttributeSet = observeConfigBooleanValue(database, 'SamlLastNameAttributeSet');
    const samlNicknameAttributeSet = observeConfigBooleanValue(database, 'SamlNicknameAttributeSet');
    const samlPositionAttributeSet = observeConfigBooleanValue(database, 'SamlPositionAttributeSet');

    return {
        currentUser: observeCurrentUser(database),
        lockedFirstName: combineLatest([ldapFirstNameAttributeSet, samlFirstNameAttributeSet]).pipe(
            switchMap(([ldap, saml]) => of$(ldap || saml)),
        ),
        lockedLastName: combineLatest([ldapLastNameAttributeSet, samlLastNameAttributeSet]).pipe(
            switchMap(([ldap, saml]) => of$(ldap || saml)),
        ),
        lockedNickname: combineLatest([ldapNicknameAttributeSet, samlNicknameAttributeSet]).pipe(
            switchMap(([ldap, saml]) => of$(ldap || saml)),
        ),
        lockedPosition: combineLatest([ldapPositionAttributeSet, samlPositionAttributeSet]).pipe(
            switchMap(([ldap, saml]) => of$(ldap || saml)),
        ),
        lockedPicture: observeConfigBooleanValue(database, 'LdapPictureAttributeSet'),
    };
});

export default withDatabase(enhanced(EditProfile));
