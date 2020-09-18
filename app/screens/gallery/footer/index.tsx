// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useEffect, useRef, useState, useImperativeHandle} from 'react';
import {Animated, StyleSheet} from 'react-native';
import {injectIntl} from 'react-intl';
import {useClipboard} from '@react-native-community/clipboard';

import {Client4} from '@mm-redux/client';

import type {CallbackFunctionWithoutArguments, DownloadRef, FooterProps, FooterRef, ShowToast, ToastRef} from 'types/screens/gallery';

import DownloadFile from './download_file';
import Summary from './summary';
import Toast from './toast';

const styles = StyleSheet.create({
    footer: {
        position: 'absolute',
        width: '100%',
        bottom: 0,
    },
});

const Footer = forwardRef<FooterRef, FooterProps>((props: FooterProps, ref) => {
    const [visible, setVisible] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const opacity = useRef(new Animated.Value(1)).current;
    const downloadingOpacitity = useRef(new Animated.Value(0)).current;
    const downloadRef = useRef<DownloadRef>(null);
    const toastRef = useRef<ToastRef>();
    const [, setClipboard] = useClipboard();

    const animate = (value: Animated.Value, show: boolean, callback?: () => void): Animated.CompositeAnimation => {
        const animation = Animated.timing(value, {
            toValue: show ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        });

        animation.start(callback);

        return animation;
    };

    const copyPublicLink = async (callback: CallbackFunctionWithoutArguments) => {
        try {
            const {formatMessage} = props.intl;
            const message = formatMessage({id: 'mobile.public_link.copied', defaultMessage: 'Public link copied'});
            const res = await Client4.getFilePublicLink(props.file.id);
            setClipboard(res.link);
            showToast(message, undefined, callback);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log('An error occurred, we should show a different toast', e);
            callback();
        }
    };

    const dowloadFile = (callback: CallbackFunctionWithoutArguments) => {
        setDownloading(true);
        callback();
    };

    const showToast: ShowToast = (text, duration, callback) => {
        toastRef.current?.show(text, duration, callback);
    };

    const startDownload = async () => {
        if (downloadRef.current) {
            await downloadRef.current.start(props.file);
        }
        setDownloading(false);
    };

    const toggle = () => {
        if (!downloading) {
            setVisible(!visible);
            return !visible;
        }

        return false;
    };

    useEffect(() => {
        const animation = animate(opacity, visible);

        return animation.stop;
    }, [visible]);

    useEffect(() => {
        let animation: Animated.CompositeAnimation;
        if (downloading) {
            animate(opacity, false, () => {
                animation = animate(downloadingOpacitity, true, startDownload);
            });
        } else {
            animate(downloadingOpacitity, false, () => {
                animation = animate(opacity, true);
            });
        }

        return () => animation?.stop();
    }, [downloading]);

    useImperativeHandle(ref, () => ({
        toggle,
    }), [visible]);

    const translateY = opacity.interpolate({
        inputRange: [0, 1],
        outputRange: [99, 0],
    });

    const downloadingY = downloadingOpacitity.interpolate({
        inputRange: [0, 1],
        outputRange: [99, 0],
    });

    return (
        <>
            <Animated.View style={[{transform: [{translateY}], opacity}, styles.footer]}>
                <Summary
                    copyPublicLink={copyPublicLink}
                    dowloadFile={dowloadFile}
                    file={props.file}
                />
                <Toast ref={toastRef}/>
            </Animated.View>
            <Animated.View style={[{transform: [{translateY: downloadingY}], opacity: downloadingOpacitity}, styles.footer]}>
                <DownloadFile ref={downloadRef}/>
            </Animated.View>
        </>
    );
});

Footer.displayName = 'Footer';

export default injectIntl(Footer, {withRef: true});
