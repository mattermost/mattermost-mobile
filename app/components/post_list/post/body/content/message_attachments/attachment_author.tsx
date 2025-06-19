// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';
import {onOpenLinkError} from '@utils/url/links';

type Props = {
    icon?: string;
    link?: string;
    name?: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
        },
        icon: {
            height: 12,
            marginRight: 3,
            width: 12,
        },
        name: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
        },
        link: {color: changeOpacity(theme.linkColor, 0.5)},
    };
});

const AttachmentAuthor = ({icon, link, name, theme}: Props) => {
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const openLink = useCallback(() => {
        if (link) {
            const onError = () => {
                onOpenLinkError(intl);
            };

            tryOpenURL(link, onError);
        }
    }, [intl, link]);

    return (
        <View style={style.container}>
            {Boolean(icon) &&
            <Image
                source={{uri: icon}}
                key='author_icon'
                style={style.icon}
            />
            }
            {Boolean(name) &&
            <Text
                key='author_name'
                onPress={openLink}
                style={[style.name, Boolean(link) && style.link]}
            >
                {name}
            </Text>
            }
        </View>
    );
};

export default AttachmentAuthor;
