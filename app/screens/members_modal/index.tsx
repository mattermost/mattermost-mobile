// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import {observeProfileLongPresTutorial} from '@queries/app/global';

import MembersModal from './members_modal';

const enhanced = withObservables([], () => ({
    tutorialWatched: observeProfileLongPresTutorial(),
}));

export default enhanced(MembersModal);
