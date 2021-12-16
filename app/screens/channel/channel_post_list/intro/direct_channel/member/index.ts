// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import Member from './member';

import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

const enhanced = withObservables([], ({member}: {member: ChannelMembershipModel}) => ({
    user: member.memberUser.observe(),
}));

export default withDatabase(enhanced(Member));
