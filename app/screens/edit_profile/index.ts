// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCustomProfileAttributesByUserId, observeCustomProfileFields} from '@queries/servers/custom_profile';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {sortCustomProfileAttributes, convertToAttributesMap, convertProfileAttributesToCustomAttributes} from '@utils/user';

import EditProfile from './edit_profile';

import type {CustomAttribute} from '@typings/api/custom_profile_attributes';
import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const ldapFirstNameAttributeSet = observeConfigBooleanValue(database, 'LdapFirstNameAttributeSet');
    const ldapLastNameAttributeSet = observeConfigBooleanValue(database, 'LdapLastNameAttributeSet');
    const ldapNicknameAttributeSet = observeConfigBooleanValue(database, 'LdapNicknameAttributeSet');
    const ldapPositionAttributeSet = observeConfigBooleanValue(database, 'LdapPositionAttributeSet');

    const samlFirstNameAttributeSet = observeConfigBooleanValue(database, 'SamlFirstNameAttributeSet');
    const samlLastNameAttributeSet = observeConfigBooleanValue(database, 'SamlLastNameAttributeSet');
    const samlNicknameAttributeSet = observeConfigBooleanValue(database, 'SamlNicknameAttributeSet');
    const samlPositionAttributeSet = observeConfigBooleanValue(database, 'SamlPositionAttributeSet');
    const customAttributesEnabled = observeConfigBooleanValue(database, 'FeatureFlagCustomProfileAttributes');

    const rawCustomAttributes = currentUser.pipe(
        switchMap((u) => (u ? observeCustomProfileAttributesByUserId(database, u.id) : of$([]))),
    );
    let formattedCustomAttributes;
    let customFields;
    if (customAttributesEnabled) {
        customFields = observeCustomProfileFields(database);

        // Convert attributes to the format expected by the component
        // NOTE: useDisplayType = false to keep raw option IDs for editing
        formattedCustomAttributes = combineLatest([rawCustomAttributes, customFields]).pipe(
            switchMap(([attributes, fields]) => {
                if (!attributes?.length) {
                    return of$([] as CustomAttribute[]);
                }

                return of$(convertProfileAttributesToCustomAttributes(attributes, fields, sortCustomProfileAttributes, false));
            }),
            switchMap((converted) => of$(convertToAttributesMap(converted))),
        );
    }

    return {
        currentUser,
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
        enableCustomAttributes: observeConfigBooleanValue(database, 'FeatureFlagCustomProfileAttributes'),
        userCustomAttributes: rawCustomAttributes,
        customFields,
        customAttributesSet: formattedCustomAttributes,
    };
});

export default withDatabase(enhanced(EditProfile));
