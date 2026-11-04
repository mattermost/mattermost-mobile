// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import ChannelInfoAttributes from '@components/channel_info_attributes/channel_info_attributes';
import {observeChannelAttributePermissions} from '@queries/servers/channel_attributes';
import {observeChannelAttributesEnabled, observeResolvedChannelAttributes} from '@queries/servers/properties';
import {channelInfoAttributesSignature, selectChannelInfoAttributes, type ResolvedChannelAttribute} from '@utils/channel_attributes';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const EMPTY: ResolvedChannelAttribute[] = [];

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const permissions = observeChannelAttributePermissions(database, channelId);

    // Listed by role, not display config: an attribute hidden from the info panel still needs
    // a row here so a channel admin can edit its value.
    const attributes = combineLatest([
        observeChannelAttributesEnabled(database).pipe(
            switchMap((enabled) => (enabled ? observeResolvedChannelAttributes(database, channelId) : of$(EMPTY))),
        ),
        permissions,
    ]).pipe(

        // Snapshot; see resolvedAttributesSignature.
        map(([resolved, perms]) => {
            const listed = selectChannelInfoAttributes(resolved, perms);
            return {listed, signature: channelInfoAttributesSignature(listed)};
        }),
        distinctUntilChanged((a, b) => a.signature === b.signature),
        map(({listed}) => listed),
    );

    return {attributes, permissions};
});

export default withDatabase(enhanced(ChannelInfoAttributes));
