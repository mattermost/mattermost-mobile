// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';

import {Preferences} from '@app/constants';
import {queryAllCustomEmojis} from '@app/queries/servers/custom_emoji';
import {queryEmojiPreferences} from '@app/queries/servers/preference';
import {getRecentReactions} from '@app/queries/servers/system';
import {getEmojis, searchEmojis} from '@app/utils/emoji/helpers';
import {buildEmojiSections} from '@utils/emoji/picker';
import {SubjectStore} from '@utils/subject_store';

import type {EmojiStore} from './interface';
import type {Database} from '@nozbe/watermelondb';

const store = new SubjectStore<Omit<EmojiStore, 'actions'>>({
    data: [],
    filteredData: null,
    categories: [],
    fuse: null,
    currentCagoryIndex: 0,
});

const emojiStore = {
    store,
    data: store.select((state) => state.data),
    filteredData: store.select((state) => state.filteredData),
    categories: store.select((state) => state.categories),
    currentCagoryIndex: store.select((state) => state.currentCagoryIndex),
    initialize: async (database: Database, skinTone?: string) => {
        const customEmojis = await queryAllCustomEmojis(database);

        const recentEmojis = await getRecentReactions(database);

        const prefs = await queryEmojiPreferences(database, Preferences.EMOJI_SKINTONE).fetch();
        const prefSkinTone = prefs?.[0]?.value ?? 'default';
        const newSkinTone = skinTone || prefSkinTone;

        const emojis = getEmojis(newSkinTone, customEmojis);
        const {sections: emojiBySectionRows, categories} = buildEmojiSections(customEmojis, recentEmojis);
        const options = {
            findAllMatches: true,
            ignoreLocation: true,
            includeMatches: true,
            shouldSort: false,
            includeScore: true,
        };

        const fuse = new Fuse(emojis, options);

        store.setState({data: emojiBySectionRows, categories, fuse});
    },
    setCurrentCategoryIndex: (index: number) => {
        store.setState({currentCagoryIndex: index});
    },
    searchEmojis: (term: string) => {
        const fuse = store.getValue().fuse;
        const result = searchEmojis(fuse, term);

        store.setState({filteredData: result});
    },
};

export default emojiStore;
