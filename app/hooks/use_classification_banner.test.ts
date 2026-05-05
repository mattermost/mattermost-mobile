// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import {registerGroupName, setPropertyFields, setSystemPropertyValues} from '@store/system_property_store';

import {useClassificationBannerState} from './use_classification_banner';

const serverUrl = 'hook-classification.test.com';
const GROUP = 'classification_markings';

const templateField: PropertyField = {
    id: 'tmpl-1',
    group_id: GROUP,
    name: 'classification',
    type: 'select',
    object_type: 'template',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {
        options: [
            {id: 'opt-ts', name: 'TOP SECRET', color: '#FCE83A'},
            {id: 'opt-s', name: 'SECRET', color: '#FF0000'},
        ],
    },
};

const linkedField: PropertyField = {
    id: 'linked-1',
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
    field_id: 'linked-1',
    value: 'opt-ts',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

beforeEach(() => {
    registerGroupName(serverUrl, GROUP, GROUP);
    setPropertyFields(serverUrl, GROUP, []);
    setSystemPropertyValues(serverUrl, GROUP, []);
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

    it('should return default state when template field is missing', () => {
        setPropertyFields(serverUrl, GROUP, [linkedField]);
        setSystemPropertyValues(serverUrl, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when linked field is missing', () => {
        setPropertyFields(serverUrl, GROUP, [templateField]);
        setSystemPropertyValues(serverUrl, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when DISPLAY_BANNER_TOP action is missing', () => {
        const noActionLinked = {...linkedField, attrs: {...linkedField.attrs, actions: []}} as PropertyField;
        setPropertyFields(serverUrl, GROUP, [templateField, noActionLinked]);
        setSystemPropertyValues(serverUrl, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return default state when no system value is set', () => {
        setPropertyFields(serverUrl, GROUP, [templateField, linkedField]);
        setSystemPropertyValues(serverUrl, GROUP, []);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should return visible state with correct level on happy path', () => {
        setPropertyFields(serverUrl, GROUP, [templateField, linkedField]);
        setSystemPropertyValues(serverUrl, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should re-derive when store values change', () => {
        setPropertyFields(serverUrl, GROUP, [templateField, linkedField]);
        setSystemPropertyValues(serverUrl, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(true);

        act(() => {
            const updatedValue = {...systemValue, value: 'opt-s'};
            setSystemPropertyValues(serverUrl, GROUP, [updatedValue]);
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'SECRET',
            color: '#FF0000',
        });
    });

    it('should re-derive when store fields change', () => {
        setSystemPropertyValues(serverUrl, GROUP, [systemValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));
        expect(result.current.visible).toBe(false);

        act(() => {
            setPropertyFields(serverUrl, GROUP, [templateField, linkedField]);
        });

        expect(result.current).toEqual({
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should return default state when option_id does not match any option', () => {
        const badValue = {...systemValue, value: 'non-existent-opt'};
        setPropertyFields(serverUrl, GROUP, [templateField, linkedField]);
        setSystemPropertyValues(serverUrl, GROUP, [badValue]);

        const {result} = renderHook(() => useClassificationBannerState(serverUrl));

        expect(result.current).toEqual({visible: false, levelName: '', color: ''});
    });
});
