// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import emojiStore from '@store/emoji_picker';

import EmojiCategoryBar from './emoji_category_bar';

const enhanced = withObservables([], () => ({
    currentIndex: emojiStore.currentCagoryIndex,
    categories: emojiStore.categories,
    currentCagoryIndex: emojiStore.currentCagoryIndex,
}));

export default enhanced(EmojiCategoryBar);
