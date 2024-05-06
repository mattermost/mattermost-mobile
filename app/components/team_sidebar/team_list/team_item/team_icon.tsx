// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, type StyleProp, type TextStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildTeamIconUrl} from '@actions/remote/team';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.sidebarBg,
            borderRadius: 8,
        },
        containerSelected: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.sidebarBg,
            borderRadius: 6,
        },
        text: {
            color: theme.sidebarText,
            textTransform: 'uppercase',
        },
        image: {
            borderRadius: 8,
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
        },
        nameOnly: {
            backgroundColor: changeOpacity(theme.sidebarText, 0.16),
        },
    };
});

type Props = {
    id: string;
    lastIconUpdate: number;
    displayName: string;
    selected: boolean;
    backgroundColor?: string;
    smallText?: boolean;
    textColor?: string;
    testID?: string;
}

export default function TeamIcon({
    id,
    lastIconUpdate,
    displayName,
    selected,
    smallText = false,
    textColor,
    backgroundColor,
    testID,
}: Props) {
    const [imageError, setImageError] = useState(false);
    const ref = useRef<View>(null);
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();
    let client = null;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (err) {
        // Do nothing
    }

    useEffect(() =>
        setImageError(false)
    , [id, lastIconUpdate]);

    const handleImageError = useCallback(() => {
        if (ref.current) {
            setImageError(true);
        }
    }, []);

    const nameOnly = imageError || !lastIconUpdate || !client;
    const containerStyle = useMemo(() => {
        if (selected) {
            return backgroundColor ? [styles.containerSelected, {backgroundColor}] : [styles.containerSelected, nameOnly && styles.nameOnly];
        }

        return backgroundColor ? [styles.container, {backgroundColor}] : [styles.container, nameOnly && styles.nameOnly];
    }, [styles, backgroundColor, selected, nameOnly]);

    const textTypography = typography('Heading', smallText ? 200 : 400, 'SemiBold');
    textTypography.fontFamily = 'Metropolis-SemiBold';

    let teamIconContent;
    if (nameOnly) {
        const textStyle: StyleProp<TextStyle> = [
            styles.text,
            textTypography,
            Boolean(textColor) && {color: textColor},
        ];

        teamIconContent = (
            <Text
                style={textStyle}
                testID={`${testID}.display_name_abbreviation`}
            >
                {displayName.substring(0, 2)}
            </Text>
        );
    } else {
        teamIconContent = (
            <FastImage
                style={styles.image}
                source={{uri: buildAbsoluteUrl(serverUrl, buildTeamIconUrl(serverUrl, id, lastIconUpdate))}}
                onError={handleImageError}
            />
        );
    }

    return (
        <View
            style={containerStyle}
            ref={ref}
            testID={testID}
        >
            {teamIconContent}
        </View>
    );
}

