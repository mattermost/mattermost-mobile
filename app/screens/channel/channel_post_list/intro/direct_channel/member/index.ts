// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeUser} from '@queries/servers/user';

import Member from './member';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

const enhanced = withObservables([], ({member, database}: {member: ChannelMembershipModel} & WithDatabaseArgs) => ({
    user: observeUser(database, member.userId),
}));

export default withDatabase(enhanced(Member));
