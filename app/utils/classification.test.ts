// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';

import {
    deriveChannelClassificationBanner,
    deriveClassificationBannerState,
} from './classification';

const GROUP = CLASSIFICATIONS_GROUP_NAME;

const systemField: PropertyField = {
    id: 'sys-1',
    group_id: GROUP,
    name: 'system_classification',
    type: 'select',
    object_type: 'system',
    target_type: 'system',
    target_id: '',
    linked_field_id: 'tmpl-1',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {
        actions: ['display_banner_top'],
        options: [
            {id: 'opt-ts', name: 'TOP SECRET', color: '#FCE83A'},
            {id: 'opt-s', name: 'SECRET', color: '#FF0000'},
        ],
    },
};

const systemValue: PropertyValue<string> = {
    id: 'val-1',
    target_id: 'system',
    target_type: 'system',
    group_id: GROUP,
    field_id: 'sys-1',
    value: 'opt-ts',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

describe('deriveClassificationBannerState', () => {
    it('should return hidden state when no group name is registered', () => {
        const result = deriveClassificationBannerState({}, {}, {});
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return hidden state when group exists but no fields', () => {
        const result = deriveClassificationBannerState(
            {},
            {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: GROUP},
        );
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return hidden state when DISPLAY_BANNER_TOP action is missing', () => {
        const noActionField = {...systemField, attrs: {...systemField.attrs, actions: []}} as PropertyField;
        const result = deriveClassificationBannerState(
            {[GROUP]: [noActionField]},
            {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: GROUP},
        );
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return hidden state when no system value is set', () => {
        const result = deriveClassificationBannerState(
            {[GROUP]: [systemField]},
            {},
            {[CLASSIFICATIONS_GROUP_NAME]: GROUP},
        );
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return visible state with correct level on happy path', () => {
        const result = deriveClassificationBannerState(
            {[GROUP]: [systemField]},
            {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: GROUP},
        );
        expect(result).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should return hidden state when option_id does not match any option', () => {
        const badValue = {...systemValue, value: 'non-existent-opt'};
        const result = deriveClassificationBannerState(
            {[GROUP]: [systemField]},
            {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [badValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: GROUP},
        );
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should discover group ID from field names when group names mapping is absent', () => {
        const result = deriveClassificationBannerState(
            {[GROUP]: [systemField]},
            {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]},
            {},
        );
        expect(result).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should return hidden state when system field is soft-deleted', () => {
        const deletedField = {...systemField, delete_at: 9999} as PropertyField;
        const result = deriveClassificationBannerState(
            {[GROUP]: [deletedField]},
            {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: GROUP},
        );
        expect(result).toEqual({visible: false, levelName: '', color: ''});
    });
});

const channelId = 'channel-123';
const groupId = 'grp-abc';

const channelFieldWithOptions: PropertyField = {
    id: 'cf-1',
    group_id: groupId,
    name: 'channel_classification',
    type: 'select',
    object_type: 'channel',
    target_type: 'system',
    target_id: '',
    linked_field_id: 'sf-1',
    attrs: {
        options: [
            {id: 'level-secret', name: 'Secret', color: '#FF0000'},
            {id: 'level-public', name: 'Public', color: '#00FF00'},
        ],
    },
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

const channelSystemField: PropertyField = {
    id: 'sf-1',
    group_id: groupId,
    name: 'system_classification',
    type: 'select',
    object_type: 'system',
    target_type: 'system',
    target_id: '',
    linked_field_id: 'tmpl-1',
    attrs: {
        options: [
            {id: 'level-secret', name: 'Secret', color: '#FF0000'},
            {id: 'level-public', name: 'Public', color: '#00FF00'},
        ],
    },
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

const channelPropertyValue: PropertyValue<string> = {
    id: 'pv-1',
    target_id: channelId,
    target_type: 'channel',
    group_id: groupId,
    field_id: channelFieldWithOptions.id,
    value: 'level-secret',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

describe('deriveChannelClassificationBanner', () => {
    it('should return no classification when no fields exist', () => {
        const result = deriveChannelClassificationBanner({}, {}, {}, channelId);
        expect(result.hasClassification).toBe(false);
        expect(result.classificationBanner).toBeUndefined();
    });

    it('should return no classification when no channel value exists', () => {
        const result = deriveChannelClassificationBanner(
            {[groupId]: [channelSystemField]},
            {},
            {[CLASSIFICATIONS_GROUP_NAME]: groupId},
            channelId,
        );
        expect(result.hasClassification).toBe(false);
    });

    it('should resolve classification banner from channel value and field options', () => {
        const result = deriveChannelClassificationBanner(
            {[groupId]: [channelSystemField]},
            {[channelId]: [channelPropertyValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: groupId},
            channelId,
        );
        expect(result.hasClassification).toBe(true);
        expect(result.classificationBanner).toEqual({
            enabled: true,
            text: '**Secret**',
            background_color: '#FF0000',
        });
    });

    it('should use native banner text when provided', () => {
        const result = deriveChannelClassificationBanner(
            {[groupId]: [channelSystemField]},
            {[channelId]: [channelPropertyValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: groupId},
            channelId,
            'Custom banner text',
        );
        expect(result.hasClassification).toBe(true);
        expect(result.classificationBanner?.text).toBe('Custom banner text');
        expect(result.classificationBanner?.background_color).toBe('#FF0000');
    });

    it('should return no classification when property value is soft-deleted', () => {
        const deletedValue = {...channelPropertyValue, delete_at: 9999};
        const result = deriveChannelClassificationBanner(
            {[groupId]: [channelSystemField]},
            {[channelId]: [deletedValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: groupId},
            channelId,
        );
        expect(result.hasClassification).toBe(false);
        expect(result.classificationBanner).toBeUndefined();
    });

    it('should return no classification when level id does not match any option', () => {
        const unknownValue = {...channelPropertyValue, value: 'nonexistent-level'};
        const result = deriveChannelClassificationBanner(
            {[groupId]: [channelSystemField]},
            {[channelId]: [unknownValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: groupId},
            channelId,
        );
        expect(result.hasClassification).toBe(false);
    });

    it('should resolve options from channel field when available', () => {
        const result = deriveChannelClassificationBanner(
            {[groupId]: [channelSystemField, channelFieldWithOptions]},
            {[channelId]: [channelPropertyValue]},
            {[CLASSIFICATIONS_GROUP_NAME]: groupId},
            channelId,
        );
        expect(result.hasClassification).toBe(true);
        expect(result.classificationBanner).toEqual({
            enabled: true,
            text: '**Secret**',
            background_color: '#FF0000',
        });
    });
});
