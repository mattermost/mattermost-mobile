// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ReplaySubject, timer, type MonoTypeOperatorFunction, type Observable} from 'rxjs';
import {distinctUntilChanged, share} from 'rxjs/operators';

import type {Database} from '@nozbe/watermelondb';

/**
 * Multicasts the source and replays its latest value to late subscribers.
 * The source is released one tick after the last unsubscribe, so a subscriber
 * that is immediately replaced (e.g. by switchMap) does not restart it.
 */
export const shareLatest = <T>(): MonoTypeOperatorFunction<T> => share<T>({
    connector: () => new ReplaySubject<T>(1),
    resetOnError: true,
    resetOnComplete: true,
    resetOnRefCountZero: () => timer(0),
});

/**
 * Returns one shared, deduplicated observable per database and key instead of
 * building a new query pipeline for every caller.
 */
export const cachePerDatabase = <T, K extends string = string>(factory: (database: Database, key: K) => Observable<T>) => {
    const cache = new WeakMap<Database, Map<K, Observable<T>>>();

    return (database: Database, key: K): Observable<T> => {
        let byKey = cache.get(database);
        if (!byKey) {
            byKey = new Map();
            cache.set(database, byKey);
        }

        let observable = byKey.get(key);
        if (!observable) {
            observable = factory(database, key).pipe(distinctUntilChanged(), shareLatest());
            byKey.set(key, observable);
        }
        return observable;
    };
};
