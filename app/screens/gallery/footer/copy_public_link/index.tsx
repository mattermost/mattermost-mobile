// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {GALLERY_FOOTER_HEIGHT} from '@constants/gallery';
import {useServerUrl} from '@context/server';
import NetworkManager from '@init/network_manager';

type Props = {
    item: GalleryItemType;
    setAction: (action: GalleryAction) => void;
}

const styles = StyleSheet.create({
    toast: {
        backgroundColor: '#3DB887', // intended hardcoded color
    },
});

const CopyPublicLink = ({item, setAction}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const [started, setStarted] = useState<boolean|undefined>();
    const mounted = useRef(false);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: GALLERY_FOOTER_HEIGHT + 8,
        opacity: withTiming(started ? 1 : 0, {duration: 300}),
    }));

    const copyLink = async () => {
        try {
            const client = NetworkManager.getClient(serverUrl);
            const {link} = await client.getFilePublicLink(item.id!);
            Clipboard.setString(link);
            setStarted(true);
        } catch {
            // do nothing
        } finally {
            setTimeout(() => {
                if (mounted.current) {
                    setStarted(false);
                }
            }, 3000);
        }
    };

    useEffect(() => {
        mounted.current = true;
        copyLink();

        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (started === false) {
            setTimeout(() => {
                if (mounted.current) {
                    setAction('none');
                }
            }, 350);
        }
    }, [started]);

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={styles.toast}
            message={formatMessage({id: 'public_link_copied', defaultMessage: 'Link copied to clipboard'})}
            iconName='check'
        />
    );
};

export default CopyPublicLink;
