// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-native';
import {BehaviorSubject} from 'rxjs';

import {CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';

import {useClassificationBannerState} from './use_classification_banner';

jest.mock('@actions/remote/classification', () => ({
    fetchClassificationBanner: jest.fn(),
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

const serverUrl = 'hook-classification.test.com';
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

beforeEach(() => {
    mockFieldsSubject.next({});
    mockValuesSubject.next({});
    mockGroupNamesSubject.next({});
    jest.clearAllMocks();
});

describe('useClassificationBannerState', () => {
    it('should return default state when group name is not registered', () => {
        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when store is empty', () => {
        mockGroupNamesSubject.next({[GROUP]: GROUP});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when DISPLAY_BANNER_TOP action is missing', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        const noActionField = {...systemField, attrs: {...systemField.attrs, actions: []}} as PropertyField;
        mockFieldsSubject.next({[GROUP]: [noActionField]});
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when no system value is set', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        mockFieldsSubject.next({[GROUP]: [systemField]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return visible state with correct level on happy path', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        mockFieldsSubject.next({[GROUP]: [systemField]});
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should re-derive when observable values change', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        mockFieldsSubject.next({[GROUP]: [systemField]});
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(true);

        act(() => {
            const updatedValue = {...systemValue, value: 'opt-s'};
            mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [updatedValue]});
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'SECRET',
            color: '#FF0000',
        });
    });

    it('should re-derive when observable fields change', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(false);

        act(() => {
            mockFieldsSubject.next({[GROUP]: [systemField]});
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should return default state when option_id does not match any option', () => {
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        mockFieldsSubject.next({[GROUP]: [systemField]});
        const badValue = {...systemValue, value: 'non-existent-opt'};
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [badValue]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should discover group ID from field names when group names mapping is absent', () => {
        mockFieldsSubject.next({[GROUP]: [systemField]});
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should show banner when fields arrive via WS before group names are populated', () => {
        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(false);

        act(() => {
            mockFieldsSubject.next({[GROUP]: [systemField]});
            mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should bootstrap fetch when expected data is missing', () => {
        const {fetchClassificationBanner} = require('@actions/remote/classification');
        fetchClassificationBanner.mockClear();

        renderHook(() => useClassificationBannerState(serverUrl));

        expect(fetchClassificationBanner).toHaveBeenCalledWith(serverUrl);
    });

    it('should not bootstrap fetch when all data is present', () => {
        const {fetchClassificationBanner} = require('@actions/remote/classification');
        mockGroupNamesSubject.next({[CLASSIFICATIONS_GROUP_NAME]: GROUP});
        mockFieldsSubject.next({[GROUP]: [systemField]});
        mockValuesSubject.next({[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: [systemValue]});
        fetchClassificationBanner.mockClear();

        renderHook(() => useClassificationBannerState(serverUrl));

        expect(fetchClassificationBanner).not.toHaveBeenCalled();
    });
});
