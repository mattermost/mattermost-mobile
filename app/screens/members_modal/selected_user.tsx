// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

type Props = {

    /*
     * How to display the names of users.
     */
    teammateNameDisplay: string;

    /*
     * The user that this component represents.
     */
    user: UserProfile;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /*
     * The test ID.
     */
    testID?: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderRadius: 16,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: 8,
            marginRight: 10,
            paddingLeft: 12,
            paddingVertical: 8,
            paddingRight: 7,
        },
        remove: {
            marginLeft: 7,
        },
        text: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

export default function SelectedUser({
    teammateNameDisplay,
    user,
    onRemove,
    testID,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const intl = useIntl();

    const onPress = useCallback(() => {
        onRemove(user.id);
    }, [onRemove, user.id]);

    return (
        <View
            style={style.container}
            testID={`${testID}.${user.id}`}
        >
            <Text
                style={style.text}
                testID={`${testID}.${user.id}.display_name`}
            >
                {displayUsername(user, intl.locale, teammateNameDisplay)}
            </Text>
            <TouchableOpacity
                style={style.remove}
                onPress={onPress}
                testID={`${testID}.${user.id}.remove.button`}
            >
                <CompassIcon
                    name='close-circle'
                    size={17}
                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                />
            </TouchableOpacity>
        </View>
    );
}
