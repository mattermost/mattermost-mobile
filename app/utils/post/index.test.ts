// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as utils from './index';

describe('post utils', () => {
    test.each([
        ['@here where is Jessica Hyde', true],
        ['@all where is Jessica Hyde', true],
        ['@channel where is Jessica Hyde', true],

        ['where is Jessica Hyde @here', true],
        ['where is Jessica Hyde @all', true],
        ['where is Jessica Hyde @channel', true],

        ['where is Jessica @here Hyde', true],
        ['where is Jessica @all Hyde', true],
        ['where is Jessica @channel Hyde', true],

        ['where is Jessica Hyde\n@here', true],
        ['where is Jessica Hyde\n@all', true],
        ['where is Jessica Hyde\n@channel', true],

        ['where is Jessica\n@here Hyde', true],
        ['where is Jessica\n@all Hyde', true],
        ['where is Jessica\n@channel Hyde', true],

        ['where is Jessica Hyde @her', false],
        ['where is Jessica Hyde @al', false],
        ['where is Jessica Hyde @chann', false],

        ['where is Jessica Hyde@here', false],
        ['where is Jessica Hyde@all', false],
        ['where is Jessica Hyde@channel', false],

        ['where is Jessica @hereHyde', false],
        ['where is Jessica @allHyde', false],
        ['where is Jessica @channelHyde', false],

        ['@herewhere is Jessica Hyde@here', false],
        ['@allwhere is Jessica Hyde@all', false],
        ['@channelwhere is Jessica Hyde@channel', false],

        ['where is Jessica Hyde here', false],
        ['where is Jessica Hyde all', false],
        ['where is Jessica Hyde channel', false],

        ['where is Jessica Hyde', false],
    ])('hasSpecialMentions: %s => %s', (message, expected) => {
        expect(utils.hasSpecialMentions(message)).toBe(expected);
    });
});
