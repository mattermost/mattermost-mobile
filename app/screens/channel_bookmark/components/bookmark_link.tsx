// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {observeConfigValue} from '@queries/servers/system';
import {fetchOpenGraph} from '@utils/opengraph';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUrlAfterRedirect} from '@utils/url';
import {matchDeepLink} from '@utils/deep_link';
import {isMinimumServerVersion} from '@utils/helpers';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    disabled: boolean;
    initialUrl?: string;
    resetBookmark: () => void;
    setBookmark: (url: string, title: string, imageUrl: string) => void;
    serverVersion?: string;
}

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

const BookmarkLink = ({disabled, initialUrl = '', resetBookmark, setBookmark, serverVersion}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const [error, setError] = useState('');
    const [url, setUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const styles = getStyleSheet(theme);
    const keyboard = (Platform.OS === 'android') ? 'default' : 'url';
    const subContainerStyle = useMemo(() => [styles.viewContainer, {paddingHorizontal: isTablet ? 42 : 0}], [isTablet, styles]);
    const descContainer = useMemo(() => [styles.description, {paddingHorizontal: isTablet ? 42 : 0}], [isTablet, styles]);
    
    // Check if server supports app links (placeholder version - will be updated when server PR is merged)
    const supportsAppLinks = isMinimumServerVersion(serverVersion || '', 10, 6, 0);

    const validateAndFetchOG = useCallback(debounce(async (text: string) => {
        setLoading(true);

        // Check if it's a custom app scheme URL (like mattermost://)
        if (matchDeepLink(text)) {
            setLoading(false);
            setBookmark(text, text, '');
            return;
        }

        let link = await getUrlAfterRedirect(text, false);

        if (link.error) {
            link = await getUrlAfterRedirect(text, true);
        }

        if (link.url) {
            const result = await fetchOpenGraph(link.url, true);
            const title = result.title || text;
            const imageUrl = result.favIcon || result.imageURL || '';
            setLoading(false);
            setBookmark(link.url, title, imageUrl);
            return;
        }
        setError(intl.formatMessage({
            id: 'channel_bookmark_add.link.invalid',
            defaultMessage: 'Please enter a valid link',
        }));
        setLoading(false);
    }, 500), [intl]);

    const onChangeText = useCallback((text: string) => {
        resetBookmark();
        setUrl(text);
        setError('');
    }, [resetBookmark]);

    const onSubmitEditing = useCallback(() => {
        if (url) {
            validateAndFetchOG(url);
        }
    }, [url, error]);

    useDidUpdate(debounce(() => {
        onSubmitEditing();
    }, 300), [onSubmitEditing]);

    return (
        <View style={subContainerStyle}>
            <FloatingTextInput
                autoCapitalize={'none'}
                autoCorrect={false}
                disableFullscreenUI={true}
                editable={!disabled}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                keyboardType={keyboard}
                returnKeyType='go'
                label={intl.formatMessage({id: 'channel_bookmark_add.link', defaultMessage: 'Link'})}
                onChangeText={onChangeText}
                theme={theme}
                error={error}
                showErrorIcon={true}
                value={url}
                onSubmitEditing={onSubmitEditing}
                endAdornment={loading &&
                    <Loading
                        size='small'
                        color={theme.buttonBg}
                        containerStyle={styles.loading}
                    />
                }
            />
            <View style={descContainer}>
                <FormattedText
                    id={supportsAppLinks ? 'channel_bookmark_add.link.input.description' : 'channel_bookmark_add.link.input.description.basic'}
                    defaultMessage={supportsAppLinks ? 'Add a link to any post, file, or any external link. You can also use app links like mattermost://' : 'Add a link to any post, file, or any external link'}
                    style={styles.descriptionText}
                    testID='channel_bookmark_add.link.input.description'
                />
            </View>
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    serverVersion: observeConfigValue(database, 'Version'),
}));

export default withDatabase(enhanced(BookmarkLink));
