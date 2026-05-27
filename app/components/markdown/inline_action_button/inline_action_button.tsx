// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle} from 'react-native';
import urlParse from 'url-parse';

import {postActionWithQuery} from '@actions/remote/integrations';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Server's mm_blocks action ID regex; mirrors webapp's MMACTION_ID_REGEX.
const MMACTION_ID_REGEX = /^[A-Za-z0-9]+$/;

// Outer envelope cap on the raw query string. Per-key/per-value caps are
// enforced server-side; this protects against crafted markdown that bloats
// the click request.
const MAX_PARAMS_LENGTH = 2048;

const MMACTION_SCHEME_PREFIX = 'mmaction://';

// 15s client-side timeout. Server outgoing-integration timeout is up to 30s,
// but the user shouldn't stare at a spinner that long.
const INLINE_ACTION_TIMEOUT_MS = 15_000;

type Props = {
    href: string;
    postId: string;
    baseTextStyle: StyleProp<TextStyle>;
    children: ReactNode;
};

type ParsedHref = {actionId: string; query: Record<string, string>};

const parseMmactionHref = (href: string): ParsedHref | null => {
    if (!href.startsWith(MMACTION_SCHEME_PREFIX)) {
        return null;
    }
    const withoutScheme = href.slice(MMACTION_SCHEME_PREFIX.length);
    const actionId = withoutScheme.split(/[/?#]/, 1)[0];
    if (!MMACTION_ID_REGEX.test(actionId)) {
        return null;
    }
    try {
        const rawString = href.includes('?') ? href.slice(href.indexOf('?') + 1).split('#')[0] : '';
        if (rawString.length > MAX_PARAMS_LENGTH) {
            return null;
        }
        const parsed = urlParse(href, true);
        const query: Record<string, string> = {};
        const queryObj = typeof parsed.query === 'object' && parsed.query !== null ? parsed.query as Record<string, string | undefined> : null;
        if (queryObj) {
            for (const key of Object.keys(queryObj)) {
                const value = queryObj[key];
                if (typeof value === 'string') {
                    query[key] = value;
                }
            }
        }
        return {actionId, query};
    } catch {
        return null;
    }
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    button: {
        color: theme.buttonBg,
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        ...typography('Body', 200, 'SemiBold'),
    },
    buttonPressed: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.24),
    },
    buttonExecuting: {
        opacity: 0.6,
    },
    error: {
        color: theme.errorTextColor,
        ...typography('Body', 100),
    },
}));

const InlineActionButton = ({href, postId, baseTextStyle, children}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const parsed = useMemo(() => parseMmactionHref(href), [href]);

    const [executing, setExecuting] = useState(false);
    const [pressed, setPressed] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const executingRef = useRef(false);
    const mountedRef = useRef(true);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        mountedRef.current = false;
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const handlePress = useCallback(async () => {
        if (executingRef.current || !parsed || !postId) {
            return;
        }
        executingRef.current = true;
        setExecuting(true);
        setActionError(null);

        let timedOut = false;
        const timeoutPromise = new Promise<{error: {message?: string}}>((resolve) => {
            timeoutRef.current = setTimeout(() => {
                timedOut = true;
                resolve({error: {message: 'timeout'}});
            }, INLINE_ACTION_TIMEOUT_MS);
        });

        try {
            const result = await Promise.race([
                postActionWithQuery(serverUrl, postId, parsed.actionId, parsed.query),
                timeoutPromise,
            ]) as {error?: {message?: string}};
            if (mountedRef.current && result?.error) {
                if (timedOut) {
                    setActionError(intl.formatMessage({
                        id: 'inline_action_button.timeout',
                        defaultMessage: 'Action timed out. Try again.',
                    }));
                } else {
                    setActionError(intl.formatMessage({
                        id: 'inline_action_button.failed',
                        defaultMessage: 'Action failed to execute.',
                    }));
                }
            }
        } finally {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            executingRef.current = false;
            if (mountedRef.current) {
                setExecuting(false);
            }
        }
    }, [intl, parsed, postId, serverUrl]);

    const handlePressIn = useCallback(() => setPressed(true), []);
    const handlePressOut = useCallback(() => setPressed(false), []);

    if (!parsed || !postId) {
        return <Text style={baseTextStyle}>{children}</Text>;
    }

    const executingLabel = intl.formatMessage({
        id: 'inline_action_button.executing',
        defaultMessage: 'Executing...',
    });

    return (
        <Text
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole='button'
            accessibilityState={{busy: executing, disabled: executing}}
            testID='inline_action_button'
            style={baseTextStyle}
        >
            <Text
                style={[
                    style.button,
                    pressed && style.buttonPressed,
                    executing && style.buttonExecuting,
                ]}
            >
                {executing ? executingLabel : children}
            </Text>
            {actionError ? (
                <Text style={style.error}>{'\n'}{actionError}</Text>
            ) : null}
        </Text>
    );
};

export default InlineActionButton;
