// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    isTablet?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            ...typography('Body', 75),
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

const DisabledFields = ({isTablet}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const containerStyle = useMemo(() => ({
        paddingHorizontal: isTablet ? 42 : 20,
        marginBottom: 16,
    }), [isTablet]);

    return (
        <View
            style={containerStyle}
        >
            <Text style={styles.text}>
                {formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'Some fields below are handled through your login provider. If you want to change them, you’ll need to do so through your login provider.',
                })}
            </Text>
        </View>
    );
};

export default DisabledFields;
