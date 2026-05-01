// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-hooks';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {
    getClassificationBannerState,
    setClassificationBannerState,
    observeClassificationBanner,
    useClassificationBannerState,
} from './classification_banner_store';

import type {ClassificationBannerState} from './classification_banner_store';

const serverUrl = 'classification-store.test.com';
const hookServerUrl = 'classification-hook.test.com';

beforeEach(async () => {
    await DatabaseManager.init([serverUrl, hookServerUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
    await DatabaseManager.destroyServerDatabase(hookServerUrl);
});

describe('classification_banner_store', () => {
    it('should return default state for a new server', () => {
        const state = getClassificationBannerState('fresh-server.test.com');
        expect(state).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should update state when setClassificationBannerState is called', () => {
        const newState: ClassificationBannerState = {visible: true, levelName: 'TOP SECRET', color: '#FCE83A'};
        setClassificationBannerState(serverUrl, newState);

        expect(getClassificationBannerState(serverUrl)).toEqual(newState);
    });

    it('should not emit when state is identical (deduplication)', () => {
        const dedupUrl = 'dedup.test.com';
        const newState: ClassificationBannerState = {visible: true, levelName: 'SECRET', color: '#FF0000'};
        setClassificationBannerState(dedupUrl, newState);

        const emissions: ClassificationBannerState[] = [];
        const sub = observeClassificationBanner(dedupUrl).subscribe((s) => emissions.push(s));

        // Current emission on subscribe
        expect(emissions).toHaveLength(1);

        // Set identical state — should not produce a new emission
        setClassificationBannerState(dedupUrl, {...newState});
        expect(emissions).toHaveLength(1);

        sub.unsubscribe();
    });

    it('should emit when state changes', () => {
        const emitUrl = 'emit.test.com';
        const emissions: ClassificationBannerState[] = [];
        const sub = observeClassificationBanner(emitUrl).subscribe((s) => emissions.push(s));

        const state1: ClassificationBannerState = {visible: true, levelName: 'SECRET', color: '#FF0000'};
        setClassificationBannerState(emitUrl, state1);

        const state2: ClassificationBannerState = {visible: true, levelName: 'TOP SECRET', color: '#FCE83A'};
        setClassificationBannerState(emitUrl, state2);

        // default + state1 + state2
        expect(emissions).toHaveLength(3);
        expect(emissions[1]).toEqual(state1);
        expect(emissions[2]).toEqual(state2);

        sub.unsubscribe();
    });

    it('should persist state to database', async () => {
        const persistUrl = 'persist.test.com';
        await DatabaseManager.init([persistUrl]);

        const newState: ClassificationBannerState = {visible: true, levelName: 'TOP SECRET', color: '#FCE83A'};
        setClassificationBannerState(persistUrl, newState);

        // Allow async persistToDatabase to settle
        await new Promise((resolve) => setTimeout(resolve, 200));

        const {database} = DatabaseManager.getServerDatabaseAndOperator(persistUrl);
        const records = await database.get('System').query().fetch();
        const record = records.find((r: {id: string}) => r.id === SYSTEM_IDENTIFIERS.CLASSIFICATION_BANNER);
        expect(record).toBeDefined();
        expect((record as any).value).toEqual(newState);
        await DatabaseManager.destroyServerDatabase(persistUrl);
    });

    it('should hydrate state from database on first access', async () => {
        const hydrateUrl = 'hydrate.test.com';
        await DatabaseManager.init([hydrateUrl]);

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(hydrateUrl);
        const seededState: ClassificationBannerState = {visible: true, levelName: 'CONFIDENTIAL', color: '#00FF00'};
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CLASSIFICATION_BANNER, value: JSON.stringify(seededState)}],
            prepareRecordsOnly: false,
        });

        // First access triggers loadFromDatabase
        const emissions: ClassificationBannerState[] = [];
        const sub = observeClassificationBanner(hydrateUrl).subscribe((s) => emissions.push(s));

        // Allow the async loadFromDatabase to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(emissions[emissions.length - 1]).toEqual(seededState);
        sub.unsubscribe();
        await DatabaseManager.destroyServerDatabase(hydrateUrl);
    });

    describe('useClassificationBannerState', () => {
        it('should subscribe and return current state', () => {
            const initialState: ClassificationBannerState = {visible: true, levelName: 'SECRET', color: '#FF0000'};
            setClassificationBannerState(hookServerUrl, initialState);

            const {result} = renderHook(() => useClassificationBannerState(hookServerUrl));
            expect(result.current).toEqual(initialState);
        });

        it('should update when state changes', () => {
            const hookUrl2 = 'hook-update.test.com';
            const {result} = renderHook(() => useClassificationBannerState(hookUrl2));
            expect(result.current.visible).toBe(false);

            act(() => {
                setClassificationBannerState(hookUrl2, {visible: true, levelName: 'TOP SECRET', color: '#FCE83A'});
            });

            expect(result.current).toEqual({visible: true, levelName: 'TOP SECRET', color: '#FCE83A'});
        });

        it('should unsubscribe on unmount', () => {
            const hookUrl3 = 'hook-unmount.test.com';
            const {unmount} = renderHook(() => useClassificationBannerState(hookUrl3));

            unmount();

            // After unmount, further state changes should not cause issues
            setClassificationBannerState(hookUrl3, {visible: true, levelName: 'SECRET', color: '#FF0000'});
        });
    });
});
