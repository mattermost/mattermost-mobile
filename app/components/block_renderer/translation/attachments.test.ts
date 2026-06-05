// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {translateAttachments} from './attachments';

describe('translateAttachments', () => {
    it('should skip invalid attachment entries', () => {
        expect(translateAttachments([null, 'invalid', {}])).toEqual([]);
    });

    it('should translate pretext as a sibling text block outside the bordered container', () => {
        const result = translateAttachments([{
            color: '#36a64f',
            pretext: 'Before attachment',
            text: 'Body text',
        }]);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({type: 'text', text: 'Before attachment'});
        expect(result[1]).toMatchObject({
            type: 'container',
            border: true,
            accent_color: '#36a64f',
            content: [{type: 'text', text: 'Body text'}],
        });
    });

    it('should wrap author icon and name in a horizontal container', () => {
        const result = translateAttachments([{
            author_name: 'Reporter',
            author_icon: 'https://example.com/icon.png',
            text: 'Update',
        }]);

        const container = result[0] as MmContainerBlock;
        expect(container.content[0]).toMatchObject({
            type: 'container',
            flow: 'horizontal',
            gap: 'small',
        });
    });

    it('should render attachment actions as horizontal button and select blocks', () => {
        const result = translateAttachments([{
            text: 'Choose an option',
            actions: [
                {id: 'btn', name: 'Approve', style: 'primary'},
                {
                    id: 'sel',
                    name: 'Pick one',
                    type: 'select',
                    options: [{text: 'A', value: 'a'}],
                },
            ],
        }]);

        const container = result[0] as MmContainerBlock;
        const actionsContainer = container.content.find((block) => block.type === 'container' && block.flow === 'horizontal') as MmContainerBlock;
        expect(actionsContainer.content).toEqual([
            expect.objectContaining({type: 'button', action_id: 'btn', text: 'Approve', style: 'primary'}),
            expect.objectContaining({type: 'static_select', action_id: 'sel', placeholder: 'Pick one'}),
        ]);
    });

    it('should pair short attachment fields into column sets', () => {
        const result = translateAttachments([{
            text: 'Report',
            fields: [
                {title: 'Severity', value: 'High', short: true},
                {title: 'Owner', value: 'Alice', short: true},
                {title: 'Notes', value: 'Long form details', short: false},
            ],
        }]);

        const container = result[0] as MmContainerBlock;
        const fieldsContainer = container.content.find((block) => (
            block.type === 'container' && block.gap === 'medium'
        )) as MmContainerBlock;

        expect(fieldsContainer.content).toHaveLength(2);
        expect(fieldsContainer.content[0]).toMatchObject({type: 'column_set'});
        expect(fieldsContainer.content[1]).toMatchObject({
            type: 'text',
            text: expect.stringContaining('Notes'),
        });
    });
});
