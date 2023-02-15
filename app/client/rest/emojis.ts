// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientEmojisMix {
    getCustomEmoji: (id: string) => Promise<CustomEmoji>;
    getCustomEmojiByName: (name: string) => Promise<CustomEmoji>;
    getCustomEmojis: (page?: number, perPage?: number, sort?: string) => Promise<CustomEmoji[]>;
    getSystemEmojiImageUrl: (filename: string) => string;
    getCustomEmojiImageUrl: (id: string) => string;
    searchCustomEmoji: (term: string, options?: Record<string, any>) => Promise<CustomEmoji[]>;
    autocompleteCustomEmoji: (name: string) => Promise<CustomEmoji[]>;
}

const ClientEmojis = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getCustomEmoji = async (id: string) => {
        return this.doFetch(
            `${this.getEmojisRoute()}/${id}`,
            {method: 'get'},
        );
    };

    getCustomEmojiByName = async (name: string) => {
        return this.doFetch(
            `${this.getEmojisRoute()}/name/${name}`,
            {method: 'get'},
        );
    };

    getCustomEmojis = async (page = 0, perPage = PER_PAGE_DEFAULT, sort = '') => {
        return this.doFetch(
            `${this.getEmojisRoute()}${buildQueryString({page, per_page: perPage, sort})}`,
            {method: 'get'},
        );
    };

    getSystemEmojiImageUrl = (filename: string) => {
        return `${this.apiClient.baseUrl}static/emoji/${filename}.png`;
    };

    getCustomEmojiImageUrl = (id: string) => {
        return `${this.apiClient.baseUrl}${this.getEmojiRoute(id)}/image`;
    };

    searchCustomEmoji = async (term: string, options = {}) => {
        return this.doFetch(
            `${this.getEmojisRoute()}/search`,
            {method: 'post', body: {term, ...options}},
        );
    };

    autocompleteCustomEmoji = async (name: string) => {
        return this.doFetch(
            `${this.getEmojisRoute()}/autocomplete${buildQueryString({name})}`,
            {method: 'get'},
        );
    };
};

export default ClientEmojis;
