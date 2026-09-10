// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    displayName: string;
}

const BUTTON_HEIGHT = 48; // From /app/utils/buttonStyles.ts, lg button
const TITLE_HEIGHT = 30 + 12; // typography 600 line height
const TEXT_HEIGHT = 22 * 3; // typography 200 line height, three lines
const MARGINS = 12 + 24 + 10; // (after title + after text + after content)

export const SNAP_POINT = TITLE_HEIGHT + TEXT_HEIGHT + BUTTON_HEIGHT + MARGINS;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
        body: {
            color: theme.centerChannelColor,
            marginTop: 12,
            marginBottom: 24,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

const close = () => {
    dismissBottomSheet();
};

const ChannelAccessRevoked = ({displayName}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const insets = useSafeAreaInsets();

    const containerStyle = useMemo(() => [style.container, {marginBottom: insets.bottom + 10}], [style, insets.bottom]);

    return (
        <View style={containerStyle}>
            <Text style={style.title}>
                {intl.formatMessage({
                    id: 'channel_access_revoked.title',
                    defaultMessage: 'Channel unavailable',
                })}
            </Text>
            <Text style={style.body}>
                {intl.formatMessage({
                    id: 'channel_access_revoked.description',
                    defaultMessage: 'You no longer have access to {displayName}. It will reappear here if access is restored.',
                }, {displayName})}
            </Text>
            <Button
                text={intl.formatMessage({id: 'channel_access_revoked.okay', defaultMessage: 'Okay'})}
                onPress={close}
                size='lg'
                theme={theme}
            />
        </View>
    );
};

export default ChannelAccessRevoked;
