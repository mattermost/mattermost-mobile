// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import emojiStore from '@app/store/emoji_picker';

import EmojiSections from './sections';

const enhanced = withObservables([], () => ({
    emojiBySectionRows: emojiStore.data,
    categories: emojiStore.categories,
    currentCagoryIndex: emojiStore.currentCagoryIndex,
}));

export default enhanced(EmojiSections);
