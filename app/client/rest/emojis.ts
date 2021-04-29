// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FormData from 'form-data';

import {analytics} from '@init/analytics';
import {CustomEmoji} from '@mm-redux/types/emojis';
import {buildQueryString} from '@mm-redux/utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientEmojisMix {
    createCustomEmoji: (emoji: CustomEmoji, imageData: any) => Promise<CustomEmoji>;
    getCustomEmoji: (id: string) => Promise<CustomEmoji>;
    getCustomEmojiByName: (name: string) => Promise<CustomEmoji>;
    getCustomEmojis: (page?: number, perPage?: number, sort?: string) => Promise<CustomEmoji[]>;
    deleteCustomEmoji: (emojiId: string) => Promise<any>;
    getSystemEmojiImageUrl: (filename: string) => string;
    getCustomEmojiImageUrl: (id: string) => string;
    searchCustomEmoji: (term: string, options?: Record<string, any>) => Promise<CustomEmoji[]>;
    autocompleteCustomEmoji: (name: string) => Promise<CustomEmoji[]>;
}

const ClientEmojis = (superclass: any) => class extends superclass {
    createCustomEmoji = async (emoji: CustomEmoji, imageData: any) => {
        analytics.trackAPI('api_emoji_custom_add');

        const formData = new FormData();
        formData.append('image', imageData);
        formData.append('emoji', JSON.stringify(emoji));
        const request: any = {
            method: 'post',
            body: formData,
        };

        if (formData.getBoundary) {
            request.headers = {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
            };
        }

        return this.doFetch(
            `${this.getEmojisRoute()}`,
            request,
        );
    };

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

    deleteCustomEmoji = async (emojiId: string) => {
        analytics.trackAPI('api_emoji_custom_delete');

        return this.doFetch(
            `${this.getEmojiRoute(emojiId)}`,
            {method: 'delete'},
        );
    };

    getSystemEmojiImageUrl = (filename: string) => {
        return `${this.url}/static/emoji/${filename}.png`;
    };

    getCustomEmojiImageUrl = (id: string) => {
        return `${this.getEmojiRoute(id)}/image`;
    };

    searchCustomEmoji = async (term: string, options = {}) => {
        return this.doFetch(
            `${this.getEmojisRoute()}/search`,
            {method: 'post', body: JSON.stringify({term, ...options})},
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
