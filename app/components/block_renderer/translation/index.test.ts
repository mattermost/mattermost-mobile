// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    ADAPTIVE_CARDS_COMPLEX,
    ADAPTIVE_CARDS_SIMPLE,
    ATTACHMENTS_COMPLEX,
    ATTACHMENTS_SIMPLE,
    BLOCK_KIT_COMPLEX,
    BLOCK_KIT_SIMPLE,
    MALFORMED_ADAPTIVE_CARDS,
    MALFORMED_ATTACHMENTS,
    MALFORMED_BLOCK_KIT,
    MALFORMED_MM_BLOCKS_MIXED,
    MALFORMED_MM_BLOCKS_ONLY_INVALID,
    MM_BLOCKS_COMPLEX,
    MM_BLOCKS_SIMPLE,
} from './test_fixtures';

import {getPostInteractiveIntegrationFormat, translatePostProps} from './index';

describe('translatePostProps', () => {
    describe('empty and missing content', () => {
        it('should return null when props have no interactive content', () => {
            expect(translatePostProps({})).toBeNull();
            expect(translatePostProps({message: 'plain post'})).toBeNull();
        });

        it('should return null when interactive arrays are empty', () => {
            expect(translatePostProps({
                mm_blocks: [],
                blocks: [],
                cards: [],
                attachments: [],
            })).toBeNull();
        });
    });

    describe('format priority', () => {
        it('should prefer mm_blocks over blocks, cards, and attachments', () => {
            expect(translatePostProps({
                mm_blocks: [...MM_BLOCKS_SIMPLE],
                blocks: [...BLOCK_KIT_SIMPLE],
                cards: [...ADAPTIVE_CARDS_SIMPLE],
                attachments: [...ATTACHMENTS_SIMPLE],
            })).toMatchSnapshot();
        });

        it('should prefer blocks over cards and attachments when mm_blocks is absent', () => {
            expect(translatePostProps({
                blocks: [...BLOCK_KIT_SIMPLE],
                cards: [...ADAPTIVE_CARDS_SIMPLE],
                attachments: [...ATTACHMENTS_SIMPLE],
            })).toMatchSnapshot();
        });

        it('should prefer cards over attachments when mm_blocks and blocks are absent', () => {
            expect(translatePostProps({
                cards: [...ADAPTIVE_CARDS_SIMPLE],
                attachments: [...ATTACHMENTS_SIMPLE],
            })).toMatchSnapshot();
        });
    });

    describe('simple payloads', () => {
        it('should translate native mm_blocks', () => {
            expect(translatePostProps({mm_blocks: [...MM_BLOCKS_SIMPLE]})).toMatchSnapshot();
        });

        it('should translate Block Kit blocks', () => {
            expect(translatePostProps({blocks: [...BLOCK_KIT_SIMPLE]})).toMatchSnapshot();
        });

        it('should translate Adaptive Cards', () => {
            expect(translatePostProps({cards: [...ADAPTIVE_CARDS_SIMPLE]})).toMatchSnapshot();
        });

        it('should translate legacy attachments', () => {
            expect(translatePostProps({attachments: [...ATTACHMENTS_SIMPLE]})).toMatchSnapshot();
        });
    });

    describe('complex payloads', () => {
        it('should translate rich mm_blocks (container, column_set, collapsible, select)', () => {
            expect(translatePostProps({mm_blocks: [...MM_BLOCKS_COMPLEX]})).toMatchSnapshot();
        });

        it('should translate rich attachments (fields, media, footer, actions, multiple cards)', () => {
            expect(translatePostProps({attachments: [...ATTACHMENTS_COMPLEX]})).toMatchSnapshot();
        });

        it('should translate rich Block Kit (accessory, fields, image, select)', () => {
            expect(translatePostProps({blocks: [...BLOCK_KIT_COMPLEX]})).toMatchSnapshot();
        });

        it('should translate rich Adaptive Cards (columns, image, action set)', () => {
            expect(translatePostProps({cards: [...ADAPTIVE_CARDS_COMPLEX]})).toMatchSnapshot();
        });
    });

    describe('malformed inputs', () => {
        it('should fall through when mm_blocks is not an array and uses attachments', () => {
            expect(translatePostProps({
                mm_blocks: 'not-an-array' as unknown,
                attachments: [{text: 'fallback attachment'}],
            })).toMatchSnapshot();
        });

        it('should not fall through when mm_blocks is a non-empty array but every entry is invalid', () => {
            const result = translatePostProps({mm_blocks: [...MALFORMED_MM_BLOCKS_ONLY_INVALID]});
            expect(result).toEqual([]);
            expect(translatePostProps({
                mm_blocks: [...MALFORMED_MM_BLOCKS_ONLY_INVALID],
                attachments: [{text: 'ignored because mm_blocks length > 0'}],
            })).toEqual([]);
        });

        it('should keep valid mm_blocks and drop invalid siblings', () => {
            expect(translatePostProps({mm_blocks: [...MALFORMED_MM_BLOCKS_MIXED]})).toMatchSnapshot();
        });

        it('should skip invalid attachment entries and keep partial attachment content', () => {
            expect(translatePostProps({attachments: [...MALFORMED_ATTACHMENTS]})).toMatchSnapshot();
        });

        it('should return empty array when every attachment entry is unusable', () => {
            expect(translatePostProps({attachments: [null, {}, 'x']})).toEqual([]);
        });

        it('should skip invalid Block Kit blocks and keep valid sections', () => {
            expect(translatePostProps({blocks: [...MALFORMED_BLOCK_KIT]})).toMatchSnapshot();
        });

        it('should skip non-AdaptiveCard entries and partial invalid card bodies', () => {
            expect(translatePostProps({cards: [...MALFORMED_ADAPTIVE_CARDS]})).toMatchSnapshot();
        });

        it('should return empty array when cards array has no translatable AdaptiveCard', () => {
            expect(translatePostProps({cards: [null, {type: 'NotACard'}]})).toEqual([]);
        });

        it('should treat non-array interactive props as absent for format detection', () => {
            expect(translatePostProps({
                mm_blocks: {type: 'text', text: 'object not array'} as unknown,
                blocks: null as unknown,
                cards: undefined,
                attachments: [{text: 'uses attachments'}],
            })).toMatchSnapshot();
        });
    });
});

describe('getPostInteractiveIntegrationFormat', () => {
    it('should return mm_block when mm_blocks is non-empty', () => {
        expect(getPostInteractiveIntegrationFormat({mm_blocks: [...MM_BLOCKS_SIMPLE]})).toBe('mm_block');
    });

    it('should return block when blocks is non-empty and mm_blocks is not used', () => {
        expect(getPostInteractiveIntegrationFormat({blocks: [...BLOCK_KIT_SIMPLE]})).toBe('block');
    });

    it('should return card when cards is non-empty and higher-priority formats are absent', () => {
        expect(getPostInteractiveIntegrationFormat({cards: [...ADAPTIVE_CARDS_SIMPLE]})).toBe('card');
    });

    it('should return attachment when only attachments are present', () => {
        expect(getPostInteractiveIntegrationFormat({attachments: [...ATTACHMENTS_SIMPLE]})).toBe('attachment');
    });

    it('should default to attachment when no interactive arrays are present', () => {
        expect(getPostInteractiveIntegrationFormat({})).toBe('attachment');
    });

    it('should match translatePostProps source priority', () => {
        const allFormats = {
            mm_blocks: [...MM_BLOCKS_SIMPLE],
            blocks: [...BLOCK_KIT_SIMPLE],
            cards: [...ADAPTIVE_CARDS_SIMPLE],
            attachments: [...ATTACHMENTS_SIMPLE],
        };

        expect(getPostInteractiveIntegrationFormat(allFormats)).toBe('mm_block');
        expect(translatePostProps(allFormats)).not.toBeNull();

        const withoutMmBlocks = {
            blocks: [...BLOCK_KIT_SIMPLE],
            cards: [...ADAPTIVE_CARDS_SIMPLE],
            attachments: [...ATTACHMENTS_SIMPLE],
        };
        expect(getPostInteractiveIntegrationFormat(withoutMmBlocks)).toBe('block');

        const onlyAttachments = {attachments: [...ATTACHMENTS_SIMPLE]};
        expect(getPostInteractiveIntegrationFormat(onlyAttachments)).toBe('attachment');
    });

    describe('malformed inputs', () => {
        it('should ignore non-array mm_blocks when choosing integration format', () => {
            expect(getPostInteractiveIntegrationFormat({
                mm_blocks: 'invalid' as unknown,
                blocks: [...BLOCK_KIT_SIMPLE],
            })).toBe('block');
        });

        it('should return mm_block when mm_blocks is a non-empty array even if translation yields no blocks', () => {
            expect(getPostInteractiveIntegrationFormat({
                mm_blocks: [...MALFORMED_MM_BLOCKS_ONLY_INVALID],
            })).toBe('mm_block');
        });

        it('should return attachment for empty arrays', () => {
            expect(getPostInteractiveIntegrationFormat({
                mm_blocks: [],
                blocks: [],
                cards: [],
                attachments: [],
            })).toBe('attachment');
        });
    });
});
