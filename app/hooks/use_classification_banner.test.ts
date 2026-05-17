// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-native';

import {CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import {registerGroupName, setPropertyFields, setPropertyValues} from '@store/system_property_store';

import {useClassificationBannerState} from './use_classification_banner';

jest.mock('@actions/remote/classification', () => ({
    fetchClassificationBanner: jest.fn(),
}));

const serverUrl = 'hook-classification.test.com';
const GROUP = 'classification_markings';

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
    registerGroupName(serverUrl, GROUP, GROUP);
    setPropertyFields(serverUrl, GROUP, []);
    setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, []);
});

describe('useClassificationBannerState', () => {
    it('should return default state when group name is not registered', () => {
        const unknownServer = 'unknown-server.test.com';
        const {result} = renderHook(() => useClassificationBannerState(unknownServer));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when store is empty', () => {
        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when DISPLAY_BANNER_TOP action is missing', () => {
        const noActionField = {...systemField, attrs: {...systemField.attrs, actions: []}} as PropertyField;
        setPropertyFields(serverUrl, GROUP, [noActionField]);
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when no system value is set', () => {
        setPropertyFields(serverUrl, GROUP, [systemField]);
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, []);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return visible state with correct level on happy path', () => {
        setPropertyFields(serverUrl, GROUP, [systemField]);
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should re-derive when store values change', () => {
        setPropertyFields(serverUrl, GROUP, [systemField]);
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(true);

        act(() => {
            const updatedValue = {...systemValue, value: 'opt-s'};
            setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [updatedValue]);
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'SECRET',
            color: '#FF0000',
        });
    });

    it('should re-derive when store fields change', () => {
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(false);

        act(() => {
            setPropertyFields(serverUrl, GROUP, [systemField]);
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should return default state when option_id does not match any option', () => {
        const badValue = {...systemValue, value: 'non-existent-opt'};
        setPropertyFields(serverUrl, GROUP, [systemField]);
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [badValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should auto-register group name and re-render when field arrives for unregistered group', () => {
        const unregisteredServer = 'unregistered.test.com';
        const groupUuid = 'uuid-new-group';
        const field = {...systemField, group_id: groupUuid};
        const value = {...systemValue, group_id: groupUuid};

        const {result} = renderHook(() => useClassificationBannerState(unregisteredServer));
        expect(result.current).toEqual({visible: false, levelName: '', color: ''});

        act(() => {
            setPropertyFields(unregisteredServer, groupUuid, [field]);
            setPropertyValues(unregisteredServer, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, groupUuid, [value]);
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
        setPropertyFields(serverUrl, GROUP, [systemField]);
        setPropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, GROUP, [systemValue]);
        fetchClassificationBanner.mockClear();

        renderHook(() => useClassificationBannerState(serverUrl));

        expect(fetchClassificationBanner).not.toHaveBeenCalled();
    });
});
