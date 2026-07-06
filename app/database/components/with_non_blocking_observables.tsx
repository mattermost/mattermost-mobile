// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// withNonBlockingObservables mirrors withObservables but renders immediately with
// undefined props on first mount, subscribing in useEffect. Use it when you want
// the component to paint before data arrives (e.g. per-row subscriptions in a list).
// The inner component must handle undefined for each injected prop.

import React, {useEffect, useRef, useState} from 'react';
import {type Observable} from 'rxjs';

type ObservableMap = Record<string, Observable<unknown>>;
type ObsValues<T extends ObservableMap> = {[K in keyof T]?: T[K] extends Observable<infer V> ? V : never};
type EnhancedProps<TInnerProps, TObservables extends ObservableMap, TOuterProps> =
    Omit<TInnerProps, keyof ObsValues<TObservables>> & TOuterProps;

export function withNonBlockingObservables<
    TOuterProps extends object,
    TObservables extends ObservableMap,
>(
    triggerKeys: ReadonlyArray<keyof TOuterProps>,
    factory: (props: TOuterProps) => TObservables,
) {
    return function enhance<TInnerProps extends object>(
        Inner: React.ComponentType<TInnerProps>,
    ) {
        const Enhanced = (outerProps: EnhancedProps<TInnerProps, TObservables, TOuterProps>) => {
            const [obsValues, setObsValues] = useState<ObsValues<TObservables>>({});
            const propsRef = useRef(outerProps);
            propsRef.current = outerProps;
            const genRef = useRef(0);

            useEffect(() => {
                const gen = ++genRef.current;
                const observables = factory(propsRef.current as unknown as TOuterProps);
                const keys = Object.keys(observables) as Array<keyof TObservables>;

                setObsValues({});

                const makeUpdater = (key: keyof TObservables) => (value: unknown) => {
                    if (gen === genRef.current) {
                        setObsValues((prev) => ({...prev, [key]: value}));
                    }
                };

                const subs = keys.map((key) =>
                    (observables[key] as Observable<unknown>).subscribe(makeUpdater(key)),
                );

                return () => subs.forEach((s) => s.unsubscribe());
            }, triggerKeys.map((k) => (outerProps as unknown as TOuterProps)[k])); // eslint-disable-line react-hooks/exhaustive-deps

            const mergedProps = {...outerProps, ...obsValues} as unknown as TInnerProps;
            return <Inner {...mergedProps}/>;
        };

        Enhanced.displayName = `withNonBlockingObservables(${Inner.displayName ?? Inner.name})`;
        return Enhanced;
    };
}
