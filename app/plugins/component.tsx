// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component, Fragment, useCallback, useEffect, useState} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import {ActivityIndicator} from 'react-native';

import {logError} from '@utils/log';

import type {PluginSource, PluginType} from './types';

export type PluginComponentProps = {
    readonly source: PluginSource;
    readonly type: PluginType;
    readonly renderLoading?: () => JSX.Element;
    readonly renderError?: (props: {readonly error: Error}) => JSX.Element;
    readonly dangerouslySetInnerJSX?: boolean;
    readonly onError?: (error: Error) => void;
    readonly shouldOpenPlugin?: (source: PluginSource, type: PluginType) => Promise<Component>;
};

function useForceUpdate(): {
    readonly forceUpdate: () => void;
    } {
    const [, setState] = React.useState(false);
    const forceUpdate = React.useCallback(() => {
        setState((e) => !e);
    }, [setState]);
    return {forceUpdate};
}

export default function PluginComponent({
    source,
    type = 'default',
    renderLoading = () => <ActivityIndicator/>,
    renderError = () => <Fragment/>,
    onError = logError,
    shouldOpenPlugin,
    ...extras
}: PluginComponentProps): JSX.Element {
    const {forceUpdate} = useForceUpdate();
    const [Plugin, setPlugin] = useState<Component | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadPlugin = async () => {
            try {
                if (typeof shouldOpenPlugin === 'function') {
                    const plugin = await shouldOpenPlugin(source, type);
                    setPlugin(() => plugin);
                    return;
                }
                throw new Error(`[Plugin]: Expected function shouldOpenPlugin, got ${typeof shouldOpenPlugin}`);
            } catch (e) {
                setPlugin(null);
                setError(e as Error);
                onError(e as Error);
                forceUpdate();
            }
        };

        loadPlugin();
    }, [forceUpdate, onError, shouldOpenPlugin, source, type]);

    const FallbackComponent = useCallback(({error: err}: {error: Error}) => {
        let message = `[Plugin]: Failed to render component ${type}.`;
        if (err?.message) {
            message += `\nDetails: ${err.message}`;
        }
        return renderError({error: new Error(message)});
    }, [renderError, type]);

    if (typeof Plugin === 'function') {
        return (
            <ErrorBoundary FallbackComponent={FallbackComponent}>
                {/* @ts-expect-error no constructor defined */}
                <Plugin {...extras}/>
            </ErrorBoundary>
        );
    } else if (error) {
        return renderError({error});
    }

    return renderLoading();
}
