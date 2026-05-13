// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';
import urlParse from 'url-parse';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {fetchOpenGraph} from '@utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUrlAfterRedirect, sanitizeUrl} from '@utils/url';

/** Maximum time to wait for HEAD/OG requests before falling back to the raw URL. */
const LINK_METADATA_TIMEOUT_MS = 12_000;

type HeadRaceResult = {url: string} | {timedOut: true} | {failed: true};

async function resolveBookmarkTargetUrl(text: string): Promise<{url: string} | {failed: true}> {
    const trimmed = text.trim();

    // Use a single shared timeout across both HTTPS and HTTP attempts so the total
    // wait is bounded by LINK_METADATA_TIMEOUT_MS (not 2x that for sequential tries).
    let timeoutId: NodeJS.Timeout;
    const timeout = new Promise<HeadRaceResult>((resolve) => {
        timeoutId = setTimeout(() => resolve({timedOut: true}), LINK_METADATA_TIMEOUT_MS);
    });

    const raceHead = (useHttp: boolean): Promise<HeadRaceResult> =>
        Promise.race([
            getUrlAfterRedirect(text, useHttp).then((r): HeadRaceResult =>
                (r.url ? {url: r.url} : {failed: true}),
            ),
            timeout,
        ]);

    try {
        // Try HTTPS first; fall back to HTTP only if it explicitly fails (not on timeout).
        const first = await raceHead(false);
        if ('timedOut' in first) {
            return {url: sanitizeUrl(trimmed, false)};
        }
        if ('url' in first) {
            return first;
        }

        const second = await raceHead(true);
        if ('timedOut' in second) {
            return {url: sanitizeUrl(trimmed, false)};
        }
        if ('url' in second) {
            return second;
        }
        return {failed: true};
    } finally {
        clearTimeout(timeoutId!);
    }
}

type Props = {
    disabled: boolean;
    initialUrl?: string;
    resetBookmark: () => void;
    setBookmark: (url: string, title: string, imageUrl: string) => void;
    setBookmarkLinkUrl?: (url: string) => void;
}

const getComparableUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    const parsed = urlParse(trimmed);
    if (parsed.host) {
        const pathname = parsed.pathname.replace(/\/+$/, '');
        return `${parsed.protocol}//${parsed.host}${pathname}${parsed.query}${parsed.hash}`;
    }

    return trimmed.replace(/\/+$/, '');
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    viewContainer: {
        marginVertical: 32,
        width: '100%',
    },
    description: {
        marginTop: 8,
    },
    descriptionText: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    loading: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
}));

const BookmarkLink = ({disabled, initialUrl = '', resetBookmark, setBookmark, setBookmarkLinkUrl}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const [error, setError] = useState('');
    const [url, setUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const bookmarkSetterRef = useRef(setBookmark);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSubmittedUrlRef = useRef(getComparableUrl(initialUrl));
    const linkChangedFromInitialRef = useRef(false);
    const linkFieldFocusedRef = useRef(false);
    const requestSequenceRef = useRef(0);
    const styles = getStyleSheet(theme);
    const keyboard = (Platform.OS === 'android') ? 'default' : 'url';
    const subContainerStyle = useMemo(() => [styles.viewContainer, {paddingHorizontal: isTablet ? 42 : 0}], [isTablet, styles]);
    const descContainer = useMemo(() => [styles.description, {paddingHorizontal: isTablet ? 42 : 0}], [isTablet, styles]);
    const initialComparableUrl = useMemo(() => getComparableUrl(initialUrl), [initialUrl]);
    const isEditing = Boolean(initialUrl);

    useEffect(() => {
        bookmarkSetterRef.current = setBookmark;
    }, [setBookmark]);

    useEffect(() => {
        lastSubmittedUrlRef.current = getComparableUrl(initialUrl);
        linkChangedFromInitialRef.current = false;
        linkFieldFocusedRef.current = false;
    }, [initialUrl]);

    const clearPendingFetch = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }
    }, []);

    const validateAndFetchOG = useCallback(async (text: string) => {
        const comparableUrl = getComparableUrl(text);
        const mySequence = requestSequenceRef.current;

        setLoading(true);
        try {
            const urlResult = await resolveBookmarkTargetUrl(text);
            if (mySequence !== requestSequenceRef.current) {
                return;
            }

            if ('failed' in urlResult) {
                setError(intl.formatMessage({
                    id: 'channel_bookmark_add.link.invalid',
                    defaultMessage: 'Please enter a valid link',
                }));
                return;
            }

            const resolvedUrl = urlResult.url;
            let title = text.trim();
            let imageUrl = '';
            try {
                const ogResult = await Promise.race([
                    fetchOpenGraph(resolvedUrl, true).catch(() => null),
                    new Promise<null>((resolve) => {
                        setTimeout(() => resolve(null), LINK_METADATA_TIMEOUT_MS);
                    }),
                ]);
                if (ogResult && mySequence === requestSequenceRef.current) {
                    title = ogResult.title || title;
                    imageUrl = ogResult.favIcon || ogResult.imageURL || '';
                }
            } catch {
                // Use link text as title when OG fetch fails or times out
            }

            if (mySequence !== requestSequenceRef.current) {
                return;
            }

            lastSubmittedUrlRef.current = comparableUrl;
            bookmarkSetterRef.current(resolvedUrl, title, imageUrl);
        } catch {
            // Ignore network failures for stale requests
        } finally {
            if (mySequence === requestSequenceRef.current) {
                setLoading(false);
            }
        }
    }, [intl]);

    const queueFetch = useCallback((text: string, delay = 500) => {
        const trimmedText = text.trim();
        const comparableUrl = getComparableUrl(trimmedText);

        if (!trimmedText || comparableUrl === lastSubmittedUrlRef.current) {
            return;
        }

        clearPendingFetch();
        debounceTimeoutRef.current = setTimeout(() => {
            validateAndFetchOG(trimmedText);
        }, delay);
    }, [clearPendingFetch, validateAndFetchOG]);

    const onChangeText = useCallback((text: string) => {
        const currentComparableUrl = getComparableUrl(url);
        const nextComparableUrl = getComparableUrl(text);
        const hasMeaningfulChangeFromInitial = nextComparableUrl !== initialComparableUrl;

        // In edit mode we only trust link changes while the link field is actively focused.
        // This avoids title edits or other rerenders from re-entering the metadata fetch path.
        if (isEditing && !linkFieldFocusedRef.current) {
            return;
        }

        clearPendingFetch();
        requestSequenceRef.current += 1;
        setLoading(false);
        setUrl(text);
        setError('');

        if (isEditing) {
            linkChangedFromInitialRef.current = hasMeaningfulChangeFromInitial;

            if (hasMeaningfulChangeFromInitial) {
                setBookmarkLinkUrl?.(text.trim());
            } else {
                resetBookmark();
            }

            lastSubmittedUrlRef.current = nextComparableUrl;
            return;
        }

        linkChangedFromInitialRef.current = hasMeaningfulChangeFromInitial;

        if (!linkFieldFocusedRef.current) {
            return;
        }

        if (nextComparableUrl === currentComparableUrl) {
            lastSubmittedUrlRef.current = nextComparableUrl;
            return;
        }

        if (!hasMeaningfulChangeFromInitial) {
            resetBookmark();
            lastSubmittedUrlRef.current = nextComparableUrl;
            return;
        }

        resetBookmark();
        lastSubmittedUrlRef.current = '';
    }, [clearPendingFetch, initialComparableUrl, isEditing, resetBookmark, setBookmarkLinkUrl, url]);

    const onSubmitEditing = useCallback(() => {
        if (isEditing || !linkChangedFromInitialRef.current) {
            return;
        }

        queueFetch(url, 0);
    }, [isEditing, queueFetch, url]);

    useDidUpdate(() => {
        if (!isEditing && url && linkChangedFromInitialRef.current) {
            queueFetch(url);
        }
    }, [isEditing, url]);

    const onFocus = useCallback(() => {
        linkFieldFocusedRef.current = true;
    }, []);

    const onBlur = useCallback(() => {
        linkFieldFocusedRef.current = false;

        if (isEditing) {
            return;
        }

        if (url.trim() && linkChangedFromInitialRef.current) {
            queueFetch(url, 0);
        }
    }, [isEditing, queueFetch, url]);

    return (
        <View style={subContainerStyle}>
            <FloatingTextInput
                rawInput={true}
                disableFullscreenUI={true}
                editable={!disabled}
                keyboardType={keyboard}
                returnKeyType='go'
                testID='channel_bookmark_add.link.input'
                label={intl.formatMessage({id: 'channel_bookmark_add.link', defaultMessage: 'Link'})}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onBlur={onBlur}
                theme={theme}
                error={error}
                value={url}
                onSubmitEditing={onSubmitEditing}
                endAdornment={loading &&
                    <Loading
                        size='small'
                        color={theme.buttonBg}
                        containerStyle={styles.loading}
                        testID='channel_bookmark_add.link.loading'
                    />
                }
            />
            <View style={descContainer}>
                <FormattedText
                    id='channel_bookmark_add.link.input.description'
                    defaultMessage='Add a link to any post, file, or any external link'
                    style={styles.descriptionText}
                    testID='channel_bookmark_add.link.input.description'
                />
            </View>
        </View>
    );
};

export default BookmarkLink;
