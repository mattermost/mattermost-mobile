// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Observable, Subject} from 'rxjs';

import {cachePerDatabase, shareLatest} from './observable';

import type {Database} from '@nozbe/watermelondb';

describe('utils/observable', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const countingSource = <T>(subject: Subject<T>) => {
        const counter = {subscriptions: 0};
        const source = new Observable<T>((subscriber) => {
            counter.subscriptions++;
            return subject.subscribe(subscriber);
        });
        return {source, counter};
    };

    describe('shareLatest', () => {
        it('should replay the latest value without resubscribing to the source', () => {
            const subject = new Subject<number>();
            const {source, counter} = countingSource(subject);
            const shared = source.pipe(shareLatest());

            const first = shared.subscribe();
            subject.next(1);
            const values: number[] = [];
            const second = shared.subscribe((v) => values.push(v));

            expect(values).toEqual([1]);
            expect(counter.subscriptions).toBe(1);
            first.unsubscribe();
            second.unsubscribe();
        });

        it('should keep the source when resubscribed within the same tick and release it afterwards', () => {
            const subject = new Subject<number>();
            const {source, counter} = countingSource(subject);
            const shared = source.pipe(shareLatest());

            shared.subscribe().unsubscribe();
            const resubscribed = shared.subscribe();
            expect(counter.subscriptions).toBe(1);

            resubscribed.unsubscribe();
            jest.runOnlyPendingTimers();
            shared.subscribe().unsubscribe();
            expect(counter.subscriptions).toBe(2);
        });
    });

    describe('cachePerDatabase', () => {
        const databaseA = {} as Database;
        const databaseB = {} as Database;

        it('should create one observable per database and key', () => {
            const factory = jest.fn(() => new Subject<number>());
            const observe = cachePerDatabase(factory);

            expect(observe(databaseA, 'one')).toBe(observe(databaseA, 'one'));
            expect(observe(databaseA, 'one')).not.toBe(observe(databaseA, 'two'));
            expect(observe(databaseA, 'one')).not.toBe(observe(databaseB, 'one'));
            expect(factory).toHaveBeenCalledTimes(3);
        });

        it('should forward repeated emissions of the same value', () => {
            const record = {id: 'record'};
            const subject = new Subject<typeof record>();
            const observe = cachePerDatabase(() => subject.asObservable());

            const values: Array<typeof record> = [];
            const subscription = observe(databaseA).subscribe((v) => values.push(v));
            subject.next(record);
            subject.next(record);

            expect(values).toEqual([record, record]);
            subscription.unsubscribe();
        });
    });
});
