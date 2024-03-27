// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';

import SkinToneSelector from './skintone_selector';

const enhance = withObservables([], () => ({
    tutorialWatched: observeTutorialWatched(Tutorial.EMOJI_SKIN_SELECTOR),
}));

export default enhance(SkinToneSelector);
