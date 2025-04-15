// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientEmojisMix} from './emojis';

describe('ClientEmojis', () => {
    let client: ClientEmojisMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getCustomEmoji', async () => {
        const id = 'emoji_id';
        await client.getCustomEmoji(id);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}/${id}`,
            {method: 'get'},
        );
    });

    test('getCustomEmojiByName', async () => {
        const name = 'emoji_name';
        await client.getCustomEmojiByName(name);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}/name/${name}`,
            {method: 'get'},
        );
    });

    test('getCustomEmojis', async () => {
        const page = 1;
        const perPage = 10;
        const sort = 'create_at';
        await client.getCustomEmojis(page, perPage, sort);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}${buildQueryString({page, per_page: perPage, sort})}`,
            {method: 'get'},
        );

        // Test with default values
        await client.getCustomEmojis();
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}${buildQueryString({page: 0, per_page: PER_PAGE_DEFAULT, sort: ''})}`,
            {method: 'get'},
        );
    });

    test('getSystemEmojiImageUrl', () => {
        const filename = 'emoji_filename';
        const result = client.getSystemEmojiImageUrl(filename);

        expect(result).toBe(`${client.apiClient.baseUrl}static/emoji/${filename}.png`);
    });

    test('getCustomEmojiImageUrl', () => {
        const id = 'emoji_id';
        const result = client.getCustomEmojiImageUrl(id);

        expect(result).toBe(`${client.apiClient.baseUrl}${client.getEmojiRoute(id)}/image`);
    });

    test('searchCustomEmoji', async () => {
        const term = 'search_term';
        const options = {option1: 'value1'};
        await client.searchCustomEmoji(term, options);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}/search`,
            {method: 'post', body: {term, ...options}},
        );

        // Test with default values
        await client.searchCustomEmoji(term);
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}/search`,
            {method: 'post', body: {term}},
        );
    });

    test('autocompleteCustomEmoji', async () => {
        const name = 'emoji_name';
        await client.autocompleteCustomEmoji(name);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getEmojisRoute()}/autocomplete${buildQueryString({name})}`,
            {method: 'get'},
        );
    });
});
