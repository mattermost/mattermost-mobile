// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import testHelper from '@test/test_helper';

import {toMilliseconds} from './datetime';
import {getNumberFileMenuOptions, getChannelNamesWithID, getOrderedFileInfos, getFileInfosIndexes, getOrderedGalleryItems} from './files';

import type ChannelModel from '@typings/database/models/servers/channel';

describe('Files utils', () => {
    const buildFileInfos = (): FileInfo[] => {
        return [{
            id: testHelper.generateId(),
            create_at: Date.now() + toMilliseconds({days: 3, hours: 12, minutes: 8, seconds: 23}),
            post_id: '123',
            size: 10,
            height: 0,
            width: 0,
            mime_type: 'application/pdf',
            user_id: 'me',
            extension: 'pdf',
            name: 'file 3',
            has_preview_image: false,
        }, {
            id: testHelper.generateId(),
            create_at: Date.now() + toMilliseconds({days: 1, hours: 14}),
            post_id: '123',
            size: 10,
            height: 100,
            width: 100,
            mime_type: 'image/png',
            user_id: 'me',
            extension: 'png',
            name: 'file 2',
            has_preview_image: true,
        }, {
            id: testHelper.generateId(),
            create_at: Date.now() + toMilliseconds({days: 1, hours: 12, minutes: 10}),
            post_id: '123',
            size: 10,
            height: 200,
            width: 200,
            mime_type: 'video/mp4',
            user_id: 'me',
            extension: 'mp4',
            name: 'file 1',
            has_preview_image: false,
        }];
    };

    test('getNumberFileMenuOptions', () => {
        expect(getNumberFileMenuOptions(false, false, false)).toBe(1);
        expect(getNumberFileMenuOptions(true, false, false)).toBe(2);
        expect(getNumberFileMenuOptions(false, false, true)).toBe(2);
        expect(getNumberFileMenuOptions(true, false, true)).toBe(3);

        expect(getNumberFileMenuOptions(true, true, true)).toBe(1);
        expect(getNumberFileMenuOptions(false, true, true)).toBe(1);
        expect(getNumberFileMenuOptions(false, true, false)).toBe(1);
    });

    test('getChannelNamesWithID', () => {
        const displayNames = ['channel 1', 'channel 2', 'channel 3'];
        const channels = displayNames.map((d, i) => ({
            id: i.toString(),
            displayName: d,
        } as ChannelModel));
        const expected = channels.reduce<Record<string, string>>((obj, channel) => {
            obj[channel.id] = channel.displayName;
            return obj;
        }, {});

        expect(getChannelNamesWithID(channels)).toEqual(expected);
    });

    test('getOrderedFileInfos', () => {
        let fileInfos = buildFileInfos();
        const result = getOrderedFileInfos(fileInfos);
        const names = result.map((f) => f.name);
        expect(names).toEqual(['file 3', 'file 2', 'file 1']);

        // testing the variant without setting create_at
        fileInfos = fileInfos.map((f) => ({
            ...f,
            create_at: undefined,
        }));
        const result2 = getOrderedFileInfos(fileInfos);
        const names2 = result2.map((f) => f.name);
        expect(names2).toEqual(names);
    });

    test('getFileInfosIndexes', () => {
        const fileInfos = getOrderedFileInfos(buildFileInfos());
        const result = [0, 1, 2].reduce<Record<string, number>>((obj, index) => {
            obj[fileInfos[index].id!] = index;
            return obj;
        }, {});

        expect(getFileInfosIndexes(fileInfos)).toEqual(result);
    });

    test('getOrderedGalleryItems', () => {
        const fileInfos = getOrderedFileInfos(buildFileInfos());
        const result = getOrderedGalleryItems(fileInfos);
        const types = result.map((f) => f.type);
        expect(types).toEqual(['file', 'image', 'video']);
    });
});
