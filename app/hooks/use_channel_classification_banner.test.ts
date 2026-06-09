// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-native';
import {BehaviorSubject} from 'rxjs';

import * as classificationActions from '@actions/remote/classification';
import {CLASSIFICATIONS_GROUP_NAME} from '@constants/classification';

import {useChannelClassificationBanner} from './use_channel_classification_banner';

jest.mock('@actions/remote/classification', () => ({
    fetchChannelClassificationValue: jest.fn().mockResolvedValue({}),
}));

const mockFieldsSubject = new BehaviorSubject<Record<string, PropertyField[]>>({});
const mockValuesSubject = new BehaviorSubject<Record<string, Array<PropertyValue<string>>>>({});
const mockGroupNamesSubject = new BehaviorSubject<Record<string, string>>({});

jest.mock('@queries/servers/properties', () => ({
    observePropertyFields: jest.fn(() => mockFieldsSubject.asObservable()),
    observePropertyValues: jest.fn(() => mockValuesSubject.asObservable()),
    observePropertyGroupNames: jest.fn(() => mockGroupNamesSubject.asObservable()),
}));

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(() => ({database: {}})),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

const serverUrl = 'https://channel-class-hook.test.com';
const channelId = 'channel-123';
const groupId = 'grp-abc';

const systemField: PropertyField = {
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

const channelFieldWithOptions: PropertyField = {
    id: 'cf-1',
    group_id: groupId,
    name: 'channel_classification',
    type: 'select',
    object_type: 'channel',
    target_type: 'system',
    target_id: '',
    linked_field_id: systemField.id,
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

function seedObservables(...extraFields: PropertyField[]) {
    mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: groupId});
    mockFieldsSubject.next({[groupId]: [systemField, ...extraFields]});
}

beforeEach(() => {
    mockFieldsSubject.next({});
    mockValuesSubject.next({});
    mockGroupNamesSubject.next({});
    jest.clearAllMocks();
});

describe('useChannelClassificationBanner', () => {
    it('should return no classification when no fields exist', () => {
        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
        expect(result.current.classificationBanner).toBeUndefined();
    });

    it('should return no classification when no channel value exists', () => {
        seedObservables();

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
    });

    it('should fetch channel classification value on mount when none exists', () => {
        seedObservables();

        renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(classificationActions.fetchChannelClassificationValue).toHaveBeenCalledWith(serverUrl, channelId);
    });

    it('should resolve classification banner from channel value and system field options', () => {
        seedObservables();
        mockValuesSubject.next({[channelId]: [channelPropertyValue]});

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

    it('should resolve banner even when channel field is absent', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: groupId});
        mockFieldsSubject.next({[groupId]: [systemField]});
        mockValuesSubject.next({[channelId]: [channelPropertyValue]});

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
        seedObservables();
        mockValuesSubject.next({[channelId]: [channelPropertyValue]});

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

    it('should react to real-time observable updates', () => {
        seedObservables();
        const freshChannelId = 'channel-realtime-test';

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, freshChannelId),
        );

        expect(result.current.hasClassification).toBe(false);

        const freshValue = {...channelPropertyValue, target_id: freshChannelId};
        act(() => {
            mockValuesSubject.next({[freshChannelId]: [freshValue]});
        });

        expect(result.current.hasClassification).toBe(true);
        expect(result.current.classificationBanner?.background_color).toBe('#FF0000');
    });

    it('should return no classification when property value is soft-deleted', () => {
        seedObservables();
        const deletedValue = {...channelPropertyValue, delete_at: 9999};
        mockValuesSubject.next({[channelId]: [deletedValue]});

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
        expect(result.current.classificationBanner).toBeUndefined();
    });

    it('should return no classification when level id does not match any option', () => {
        seedObservables();
        const unknownValue = {...channelPropertyValue, value: 'nonexistent-level'};
        mockValuesSubject.next({[channelId]: [unknownValue]});

        const {result} = renderHook(() =>
            useChannelClassificationBanner(serverUrl, channelId),
        );

        expect(result.current.hasClassification).toBe(false);
    });

    it('should resolve options from channel field when available', () => {
        seedObservables(channelFieldWithOptions);
        mockValuesSubject.next({[channelId]: [channelPropertyValue]});

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
});
