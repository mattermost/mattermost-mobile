// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-native';

import * as classificationActions from '@actions/remote/classification';
import * as store from '@store/system_property_store';

import {useChannelClassificationBanner} from './use_channel_classification_banner';

jest.mock('@actions/remote/classification', () => ({
    fetchChannelClassificationValue: jest.fn().mockResolvedValue({}),
}));

const serverUrl = 'https://channel-class-hook.test.com';
const channelId = 'channel-123';
const groupId = 'grp-abc';

const templateField: PropertyField = {
    id: 'tf-1',
    group_id: groupId,
    name: 'classification',
    type: 'select',
    object_type: 'template',
    target_type: 'system',
    target_id: '',
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

const channelField: PropertyField = {
    id: 'cf-1',
    group_id: groupId,
    name: 'channel_classification',
    type: 'select',
    object_type: 'channel',
    target_type: 'system',
    target_id: '',
    linked_field_id: templateField.id,
    attrs: {},
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

const channelPropertyValue: PropertyValue<string> = {
    id: 'pv-1',
    target_id: channelId,
    target_type: 'channel',
    group_id: groupId,
    field_id: channelField.id,
    value: 'level-secret',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

function seedStore() {
    store.registerGroupName(serverUrl, 'classification_markings', groupId);
    store.setPropertyFields(serverUrl, groupId, [templateField, channelField]);
}

function clearStore() {
    store.setPropertyFields(serverUrl, groupId, []);
    store.setPropertyValues(serverUrl, 'system', groupId, []);
}

beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
});

describe('useChannelClassificationBanner', () => {
    it('should return no classification when group name is not registered', () => {
        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
        expect(result.current.classificationBanner).toBeUndefined();
    });

    it('should return no classification when channel field is missing', () => {
        store.registerGroupName(serverUrl, 'classification_markings', groupId);
        store.setPropertyFields(serverUrl, groupId, [templateField]);

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
    });

    it('should return no classification when no property value exists', () => {
        seedStore();

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
    });

    it('should fetch channel classification value on mount when none exists', () => {
        seedStore();

        renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(classificationActions.fetchChannelClassificationValue).toHaveBeenCalledWith(serverUrl, channelId);
    });

    it('should resolve classification banner from property value', () => {
        seedStore();
        store.updatePropertyValues(serverUrl, channelId, groupId, [channelPropertyValue]);

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(true);
        expect(result.current.classificationBanner).toEqual({
            enabled: true,
            text: '**Secret**',
            background_color: '#FF0000',
        });
    });

    it('should use native banner text when available', () => {
        seedStore();
        store.updatePropertyValues(serverUrl, channelId, groupId, [channelPropertyValue]);

        const nativeBanner: ChannelBannerInfo = {
            enabled: true,
            text: 'Custom banner text',
            background_color: '#0000FF',
        };

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId, nativeBanner),
        );

        expect(result.current.hasClassification).toBe(true);
        expect(result.current.classificationBanner?.text).toBe('Custom banner text');
        expect(result.current.classificationBanner?.background_color).toBe('#FF0000');
    });

    it('should react to real-time store updates', () => {
        seedStore();
        const freshChannelId = 'channel-realtime-test';

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, freshChannelId),
        );

        expect(result.current.hasClassification).toBe(false);

        const freshValue = {...channelPropertyValue, target_id: freshChannelId};
        act(() => {
            store.updatePropertyValues(serverUrl, freshChannelId, groupId, [freshValue]);
        });

        expect(result.current.hasClassification).toBe(true);
        expect(result.current.classificationBanner?.background_color).toBe('#FF0000');
    });

    it('should return no classification when property value is soft-deleted', () => {
        seedStore();
        const deletedValue = {...channelPropertyValue, delete_at: 9999};
        store.updatePropertyValues(serverUrl, channelId, groupId, [deletedValue]);

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
        expect(result.current.classificationBanner).toBeUndefined();
    });

    it('should return no classification when level id does not match any option', () => {
        seedStore();
        const unknownValue = {...channelPropertyValue, value: 'nonexistent-level'};
        store.updatePropertyValues(serverUrl, channelId, groupId, [unknownValue]);

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
    });
});
