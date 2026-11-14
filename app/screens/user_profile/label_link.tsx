// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity} from 'react-native';

import {showPhoneLinkOptions} from '@calls/components/phone_link_options';
import {isPhoneDialingAvailable} from '@calls/state';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet} from '@screens/navigation';
import {getTelNumber} from '@utils/phone_number';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getScheme, tryOpenURL} from '@utils/url';

type Props = {
    description: string;
    linkType: string;
    testID?: string;
    title?: string;
    userId?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    link: {
        color: theme.linkColor,
        overflow: 'hidden',
        flex: 2,
        ...typography('Body', 200),
    },
    button: {
        flex: 2,
    },
}));

const UserProfileLink = ({description, linkType, testID, title, userId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(useTheme());

    // don't try to be smart, if there is already a scheme, don't add one, otherwise add the most likely one
    let url = description;
    if (!getScheme(description)) {
        url = linkType === 'url' ? `https://${description}` : `tel:${description}`;
    }
    const openURL = usePreventDoubleTap(useCallback(async () => {
        if (linkType === 'phone' && isPhoneDialingAvailable(serverUrl)) {
            await dismissBottomSheet();
            showPhoneLinkOptions(intl, serverUrl, {number: getTelNumber(url), targetUserId: userId, displayLabel: title}, () => tryOpenURL(url));
            return;
        }

        tryOpenURL(url);
    }, [linkType, intl, serverUrl, userId, title, url]));

    return (
        <TouchableOpacity
            onPress={openURL}
            style={styles.button}
        >
            <Text
                style={styles.link}
                numberOfLines={1}
                testID={`${testID}.${linkType}`}
            >
                {description}
            </Text>
        </TouchableOpacity>
    );
};

export default UserProfileLink;
