// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, type StyleProp, Text, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {fetchOpenGraph, type OpenGraph} from '@utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    url?: string;
    theme: Theme;
}

type OpenGraphImageProps = Props & {
    style: StyleProp<ViewStyle>;
};

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderWidth: 1,
        borderRadius: 4,
        flexDirection: 'row',
        maxHeight: 96,
        height: 96,
        marginHorizontal: 20,
        padding: 12,
    },
    flex: {flex: 1},
    image: {
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        borderWidth: 1,
        height: 72,
        justifyContent: 'center',
        marginLeft: 10,
        width: 72,
    },
    link: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 4,
        ...typography('Body', 75, 'Regular'),
    },
    title: {
        color: theme.linkColor,
        ...typography('Body', 200, 'SemiBold'),
    },
}));

const OpenGraphImage = ({style, theme, url}: OpenGraphImageProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const onLoad = useCallback(() => {
        setLoading(false);
    }, []);

    const onError = useCallback(() => {
        setError(true);
        setLoading(false);
    }, []);

    return (
        <View style={style}>
            {error && !loading &&
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.16)}
                name='file-image-broken-outline-large'
                size={24}
            />
            }
            {loading &&
            <ActivityIndicator
                color={changeOpacity(theme.centerChannelColor, 0.16)}
                size='small'
            />
            }
            {!error &&
            <Image
                contentFit='cover'
                source={{uri: url}}
                style={{borderRadius: 4, height: 72, width: 72}}
                onLoad={onLoad}
                onError={onError}
            />
            }
        </View>
    );
};

const LinkPreview = ({theme, url}: Props) => {
    const styles = getStyles(theme);
    const [data, setData] = useState<OpenGraph|undefined>();

    useEffect(() => {
        if (url) {
            fetchOpenGraph(url).then(setData);
        }
    }, [url]);

    if (!data || data.error) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.flex}>
                <Text
                    numberOfLines={2}
                    style={styles.title}
                >
                    {url}
                </Text>
                <Text
                    numberOfLines={1}
                    style={styles.link}
                >
                    {data!.link}
                </Text>
            </View>
            {Boolean(data.imageURL) &&
            <OpenGraphImage
                style={styles.image}
                theme={theme}
                url={data.imageURL}
            />
            }
        </View>
    );
};

export default LinkPreview;
