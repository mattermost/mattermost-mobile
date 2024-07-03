// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Client, type ClientConfig} from 'mocha-remote-client';
import React, {useEffect, useState, createContext, useContext} from 'react';
import {Text, Platform, type TextProps} from 'react-native';
import parseErrorStack, {
    type StackFrame,
} from 'react-native/Libraries/Core/Devtools/parseErrorStack';
import symbolicateStackTrace from 'react-native/Libraries/Core/Devtools/symbolicateStackTrace';

import type {JetConfig} from './types';
export type {JetConfig};

export type Status =
  | {
      kind: 'waiting';
    }
  | {
      kind: 'running';
      failures: number;
      totalTests: number;
      currentTest: string;
      currentTestIndex: number;
    }
  | {
      kind: 'ended';
      failures: number;
      totalTests: number;
    };

export type JetProviderProps = React.PropsWithChildren<
  {
    tests: (context: JetConfig) => void;
  } & Partial<Pick<ClientConfig, 'url' | 'title'>>
>;

export type JetContextValue = {
  connected: boolean;
  status: Status;
  config: JetConfig;
};

export const JetContext = createContext<JetContextValue>({
    connected: false,
    status: {kind: 'waiting'},
    config: {},
});

function isExternalFrame({file}: StackFrame) {
    return (
        !file.includes('/jet/') &&
    !file.includes('/mocha-remote/packages/client/dist/') &&
    !file.includes('/mocha-remote-client/dist/')
    );
}

function framesToStack(error: Error, frames: StackFrame[]) {
    const lines = frames.
        filter(isExternalFrame).
        map(({methodName, column, file, lineNumber}) => {
            return `    at ${methodName} (${file}:${lineNumber}:${column})`;
        });
    return `${error.name}: ${error.message}\n${lines.join('\n')}`;
}

export function JetProvider(props: JetProviderProps): React.JSX.Element {
    const [isConnected, setConnected] = useState<boolean>(false);
    const [currentStatus, setStatus] = useState<Status>({kind: 'waiting'});
    const [currentConfig, setConfig] = useState<JetConfig>({});
    useEffect(() => {
        const client = new Client({
            ...props,
            title: props.title ?? `Jet tests on ${Platform.OS}`,
            async transformFailure(_, err) {
                const stack = parseErrorStack(err.stack as any);
                const symbolicated = (await symbolicateStackTrace(stack)) as any;
                err.stack = framesToStack(err, symbolicated.stack);
                return err;
            },
            tests(_config) {
                beforeEach(() => {
                    return new Promise<void>((resolve) => setImmediate(resolve));
                });
                afterEach(async () => {
                    if (_config.coverage) {
                        const coverage = (global as any).__coverage__ ?? {};
                        const url =
              (props.url ?? 'ws://localhost:8090').replace('ws://', 'http://') +
              '/coverage';
                        return fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(coverage),
                        });
                    }
                    return Promise.resolve();
                });
                props.tests(_config);
                setConfig(_config);
            },
        }).
            on('connection', () => {
                setConnected(true);
            }).
            on('disconnection', () => {
                setConnected(false);
            }).
            on('running', (runner) => {
                if (runner.total === 0) {
                    setStatus({
                        kind: 'ended',
                        totalTests: 0,
                        failures: 0,
                    });
                }
                let currentTestIndex = 0;
                runner.
                    on('test', (test) => {
                        setStatus({
                            kind: 'running',
                            currentTest: test.fullTitle(),
                            currentTestIndex: currentTestIndex++,
                            totalTests: runner.total,
                            failures: runner.failures,
                        });
                    }).
                    on('end', () => {
                        setStatus({
                            kind: 'ended',
                            totalTests: runner.total,
                            failures: runner.failures,
                        });
                    });
            });

        return () => {
            client.disconnect();
        };
    }, [setStatus, setConfig, props]);

    return (
        <JetContext.Provider
            value={{
                status: currentStatus,
                connected: isConnected,
                config: currentConfig,
            }}
        >
            {props.children}
        </JetContext.Provider>
    );
}

export function useJetContext() {
    return useContext(JetContext);
}

function getStatusEmoji(status: Status) {
    if (status.kind === 'running') {
        return '🏃';
    } else if (status.kind === 'waiting') {
        return '⏳';
    } else if (status.kind === 'ended' && status.totalTests === 0) {
        return '🤷';
    } else if (status.kind === 'ended' && status.failures > 0) {
        return '❌';
    } else if (status.kind === 'ended') {
        return '✅';
    }
    return null;
}

export function StatusEmoji(props: TextProps) {
    const {status} = useJetContext();
    return <Text {...props}>{getStatusEmoji(status)}</Text>;
}

function getStatusMessage(status: Status) {
    if (status.kind === 'running') {
        return `[${status.currentTestIndex + 1} of ${status.totalTests}] ${status.currentTest}`;
    } else if (status.kind === 'waiting') {
        return 'Waiting for Jet to start tests...';
    } else if (status.kind === 'ended' && status.failures > 0) {
        return `${status.failures} tests failed!`;
    } else if (status.kind === 'ended') {
        return 'All tests succeeded!';
    }
    return null;
}

export function StatusText(props: TextProps) {
    const {status} = useJetContext();
    return <Text {...props}>{getStatusMessage(status)}</Text>;
}

function getConnectionMessage(connected: boolean) {
    if (connected) {
        return '🛜 Connected to Jet';
    }
    return '🔌 Disconnected from Jet';
}

export function ConnectionText(props: TextProps) {
    const {connected} = useJetContext();
    return <Text {...props}>{getConnectionMessage(connected)}</Text>;
}
