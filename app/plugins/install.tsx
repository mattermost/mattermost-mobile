// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import GenericClient from '@mattermost/react-native-network-client';
import React, {Component} from 'react';

import PluginComponent, {type PluginComponentProps} from './component';

import type {
    PluginCache,
    PluginContextConfig,
    PluginOngoingRequests,
    PluginRequestFactory,
    PluginResponse,
    PluginSource,
    PluginType,
    PluginFactory,
} from './types';

const globalName = '__MMPLUGIN__';

const defaultGlobal = Object.freeze({

    // Provide modules access to the plugins via require
    require: (moduleId: string) => {
        switch (moduleId) {
            // Needed to execute jsx code
            case 'react/jsx-runtime':
                return require('react/jsx-runtime');

            // Helper function for interop needed after transpiling with babel
            case '@babel/runtime/helpers/interopRequireDefault':
                return (arg: any) => arg;

            // The react and react-native libraries
            case 'react':
                return require('react');
            case 'react-native':
                return require('react-native');

            /*
            /* Additional dependencies that we want
            /* to enable its use with plugins
            */
            case 'react-native-reanimated':
                return require('react-native-reanimated');
            case 'react-native-safe-area-context':
                return require('react-native-safe-area-context');
            case 'expo-image':
                return require('expo-image');
            case '@mattermost/react-native-network-client':
                return require('@mattermost/react-native-network-client');

            /*
            /* Local components and functions that we want
            /* to enable its use with plugins
            */
            case '@client/rest':
                return require('@client/rest');
            case '@utils/typography':
                return require('@utils/typography');
            case '@utils/theme':
                return require('@utils/theme');
            case '@components/markdown':
                return require('@components/markdown');
            case '@utils/markdown':
                return require('@utils/markdown');
            default:
                // When a module is not available in the
                // plugin context we return undefined
                // this will cause the plugin to fail
                // to load and render as is trying to access
                // functionality not availble to them.
                return undefined;
        }
    },
});

const cache: PluginCache = new Map();
const ongoingRequests: PluginOngoingRequests = new Map();

const requestPluginFactory = ({
    buildRequestForUri,
    verify,
}: PluginRequestFactory) => async (source: PluginSource): Promise<PluginResponse> => {
    if (cache.has(source.uri)) {
        return {data: cache.get(source.uri), code: 304};
    }

    if (ongoingRequests.has(source.uri)) {
        return ongoingRequests.get(source.uri)!;
    }

    const requestPromise = buildRequestForUri(source.uri, source.options).
        then(async (res) => {
            if (!res.data || typeof res.data !== 'string' || res.code > 400) {
                ongoingRequests.delete(source.uri);
                throw new Error(`[Plugin]: data for uri "${source.uri}" is invalid.`);
            }
            const verified = await verify(res);
            if (!verified) {
                ongoingRequests.delete(source.uri);
                throw new Error(`[Plugin]: Failed to verify "${source.uri}".`);
            }

            cache.set(source.uri, res.data);
            return {data: res.data, code: res.code} as PluginResponse;
        }).catch((error) => {
            throw new Error(error);
        }).finally(() => {
            ongoingRequests.delete(source.uri);
        });

    ongoingRequests.set(source.uri, requestPromise);
    return requestPromise;
};

const openPluginFactory = ({
    shouldRequestPlugin,
    shouldCreateComponent,
}: PluginFactory) => async (source: PluginSource, type: PluginType): Promise<Component> => {
    const {data} = await shouldRequestPlugin(source);
    if (!data || typeof data !== 'string') {
        throw new Error(`[Plugin]: Expected valid data for source ${source.uri} with type ${type}.`);
    }
    return shouldCreateComponent(data, type);
};

const createComponentFactory = (global = defaultGlobal) => async (src: string, type: PluginType): Promise<React.Component> => {
    try {
        // eslint-disable-next-line no-new-func
        const pluginComponent = await new Function(
            globalName,
            `${Object.keys(global).map((key) => {
                return `var ${key} = ${globalName}.${key};`;
            }).join('\n')}; const exports = {}; ${src}; return exports.${type};`,
        )(global);
        if (typeof pluginComponent !== 'function') {
            throw new Error(
                `[Plugin]: Expected function, encountered ${typeof pluginComponent}. Did you forget to mark your Plugin as a ${type} export?`,
            );
        }
        return pluginComponent;
    } catch (error) {
        throw new Error(
            `[Plugin]: Expected function, encountered an error trying to build the component for ${type}.\nDetails: ${error}`,
        );
    }
};

export default function installPlugin({
    buildRequestForUri = GenericClient.get,
    global = defaultGlobal,
    verify,
}: PluginContextConfig) {
    if (typeof verify !== 'function') {
        throw new Error('[Plugin]: To install a plugin, you **must** pass a verify() function.');
    }

    const shouldCreateComponent = createComponentFactory(global);
    const shouldRequestPlugin = requestPluginFactory({
        buildRequestForUri,
        verify,
    });
    const shouldOpenPlugin = openPluginFactory({
        shouldRequestPlugin,
        shouldCreateComponent,
    });

    const preload = async (uri: string, pluginType: PluginType) => {
        return shouldOpenPlugin({uri}, pluginType);
    };

    const pluginComponent = (props: PluginComponentProps) => (
        <PluginComponent
            {...props}
            shouldOpenPlugin={shouldOpenPlugin}
        />
    );

    return Object.freeze({
        Plugin: pluginComponent,
        preload,
        clearCache: () => cache.clear(),
    });
}
