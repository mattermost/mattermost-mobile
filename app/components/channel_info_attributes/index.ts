// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import ChannelInfoAttributes from '@components/channel_info_attributes/channel_info_attributes';
import {DISPLAY_LABEL_INFO} from '@constants/channel_attributes';
import {observeChannelAttributesEnabled, observeResolvedChannelAttributes} from '@queries/servers/properties';
import {selectChannelInfoAttributes, type ResolvedChannelAttribute} from '@utils/channel_attributes';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const EMPTY: ResolvedChannelAttribute[] = [];

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const attributes = observeChannelAttributesEnabled(database).pipe(
        switchMap((enabled) => (enabled ? observeResolvedChannelAttributes(database, channelId) : of$(EMPTY))),
        map((resolved) => selectChannelInfoAttributes(resolved, DISPLAY_LABEL_INFO)),
    );

    return {attributes};
});

export default withDatabase(enhanced(ChannelInfoAttributes));
