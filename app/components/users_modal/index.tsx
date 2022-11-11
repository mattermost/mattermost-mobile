// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import {observeProfileLongPresTutorial} from '@queries/app/global';

import UsersModal from './users_modal';

const enhanced = withObservables([], () => ({
    tutorialWatched: observeProfileLongPresTutorial(),
}));

export default enhanced(UsersModal);
