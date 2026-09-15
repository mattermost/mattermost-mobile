// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {executeDialogAction} from '@actions/remote/integrations';
import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    field: AppField;
    testID: string;
};

const messages = defineMessages({
    actionFailed: {
        id: 'interactive_dialog.action_button.error',
        defaultMessage: 'Action failed',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {marginTop: 15, marginBottom: 10, marginLeft: 15, marginRight: 15},
    errorText: {color: theme.errorTextColor, marginTop: 4, ...typography('Body', 75, 'Regular')},
}));

const AppsFormActionButton = ({field, testID}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const handlePress = usePreventDoubleTap(useCallback(async () => {
        if (!field.action_button_url) {
            return;
        }

        setLoading(true);
        setError(undefined);

        const result = await executeDialogAction(serverUrl, field.action_button_url, field.action_button_context);

        setLoading(false);
        if ('error' in result) {
            setError(intl.formatMessage(messages.actionFailed));
        }
    }, [field.action_button_url, field.action_button_context, serverUrl, intl]));

    return (
        <View style={style.container}>
            <Button
                onPress={handlePress}
                text={field.label || field.modal_label || ''}
                theme={theme}
                showLoader={loading}
                disabled={loading || !field.action_button_url}
                testID={testID}
            />
            {error && (
                <Text style={style.errorText}>{error}</Text>
            )}
        </View>
    );
};

AppsFormActionButton.displayName = 'AppsFormActionButton';

export default AppsFormActionButton;
