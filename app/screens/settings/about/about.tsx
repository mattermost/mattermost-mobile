// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import {applicationId, nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {getLicenseLoadMetric} from '@actions/remote/license';
import Config from '@assets/config.json';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import SettingContainer from '@components/settings/container';
import AboutLinks from '@constants/about_links';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {tryOpenURL} from '@utils/url';
import {onOpenLinkError} from '@utils/url/links';

import LearnMore from './learn_more';
import Subtitle from './subtitle';
import Title from './title';
import TosPrivacyContainer from './tos_privacy';

import type {AvailableScreens} from '@typings/screens/navigation';

const MATTERMOST_BUNDLE_IDS = ['com.mattermost.rnbeta', 'com.mattermost.rn'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        logoContainer: {
            alignItems: 'center',
            paddingHorizontal: 20,
            marginTop: 20,
        },
        lineStyles: {
            width: '100%',
            marginTop: 40,
            marginBottom: 24,
        },
        leftHeading: {
            ...typography('Body', 200, 'SemiBold'),
            marginRight: 8,
            color: theme.centerChannelColor,
        },
        rightHeading: {
            ...typography('Body', 200, 'Regular'),
            color: theme.centerChannelColor,
        },
        infoContainer: {
            flexDirection: 'column',
            paddingHorizontal: 20,
        },
        info: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        licenseContainer: {
            flexDirection: 'row',
            marginTop: 20,
        },
        noticeContainer: {
            flexDirection: 'column',
        },
        noticeLink: {
            color: theme.linkColor,
            ...typography('Body', 50, 'Regular'),
        },
        hashContainer: {
            flexDirection: 'column',
        },
        footerTitleText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 50, 'SemiBold'),
        },
        footerText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 50),
            marginVertical: 10,
        },
        copyrightText: {
            marginBottom: 0,
        },
        tosPrivacyContainer: {
            flexDirection: 'row',
            marginBottom: 10,
        },
        group: {
            flexDirection: 'row',
        },
        copyInfoButtonContainer: {
            width: 120,
            marginTop: 10,
            position: 'relative',
        },
        thinLine: {
            height: 0.2,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            alignSelf: 'stretch',
            marginVertical: 20,
        },
    };
});

type AboutProps = {
    componentId: AvailableScreens;
    config: ClientConfig;
    license?: ClientLicense;
}
const About = ({componentId, config, license}: AboutProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const [loadMetric, setLoadMetric] = useState<number | null>(null);

    useEffect(() => {
        const fetchLoadMetric = async () => {
            const isLicensed = license?.IsLicensed === 'true';
            const result = await getLicenseLoadMetric(serverUrl, config.Version, isLicensed);

            // Only set the metric if we got a number back
            if (result !== null && typeof result === 'number') {
                setLoadMetric(result);
            }
        };

        fetchLoadMetric();
    }, [config.Version, license?.IsLicensed, serverUrl]);

    const openURL = useCallback((url: string) => {
        const onError = () => {
            onOpenLinkError(intl);
        };

        tryOpenURL(url, onError);
    }, [intl]);

    const handleAboutTeam = usePreventDoubleTap(useCallback(() => {
        return openURL(Config.WebsiteURL);
    }, [openURL]));

    const handlePlatformNotice = usePreventDoubleTap(useCallback(() => {
        return openURL(Config.ServerNoticeURL);
    }, [openURL]));

    const handleMobileNotice = usePreventDoubleTap(useCallback(() => {
        return openURL(Config.MobileNoticeURL);
    }, [openURL]));

    const handleTermsOfService = usePreventDoubleTap(useCallback(() => {
        return openURL(AboutLinks.TERMS_OF_SERVICE);
    }, [openURL]));

    const handlePrivacyPolicy = usePreventDoubleTap(useCallback(() => {
        return openURL(AboutLinks.PRIVACY_POLICY);
    }, [openURL]));

    const serverVersion = useMemo(() => {
        const buildNumber = config.BuildNumber;
        const version = config.Version;

        if (buildNumber === version) {
            return version;
        }

        return intl.formatMessage({id: 'settings.about.server.version.value', defaultMessage: '{version} (Build {buildNumber})'}, {version, buildNumber});
    }, [config, intl]);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const copyToClipboard = useCallback(
        () => {
            const appVersion = intl.formatMessage({id: 'settings.about.app.version', defaultMessage: 'App Version: {version} (Build {number})'}, {version: nativeApplicationVersion, number: nativeBuildVersion});
            const buildNumber = config.BuildNumber;
            const version = config.Version;
            const server = buildNumber === version ? intl.formatMessage({id: 'settings.about.server.version.noBuild', defaultMessage: 'Server Version: {version}'}, {version}) : intl.formatMessage({id: 'settings.about.server.version', defaultMessage: 'Server Version: {version} (Build {buildNumber})'}, {version, buildNumber});
            const database = intl.formatMessage({id: 'settings.about.database', defaultMessage: 'Database: {driverName}'}, {driverName: config.SQLDriverName});
            const databaseSchemaVersion = intl.formatMessage({id: 'settings.about.database.schema', defaultMessage: 'Database Schema Version: {version}'}, {version: config.SchemaVersion});
            let copiedString = `${appVersion}\n${server}\n${database}\n${databaseSchemaVersion}`;

            if (loadMetric !== null) {
                const loadMetricStr = intl.formatMessage({id: 'settings.about.license.load_metric', defaultMessage: 'Load Metric: {load}'}, {load: loadMetric});
                copiedString += `\n${loadMetricStr}`;
            }

            Clipboard.setString(copiedString);
            showSnackBar({barType: SNACK_BAR_TYPE.INFO_COPIED, sourceScreen: componentId});
        },
        [intl, config.BuildNumber, config.Version, config.SQLDriverName, config.SchemaVersion, loadMetric, componentId],
    );

    return (
        <SettingContainer testID='about'>
            <View style={styles.logoContainer}>
                <CompassIcon
                    color={theme.centerChannelColor}
                    name='mattermost'
                    size={88}
                    testID='about.logo'
                />
                <Title
                    config={config}
                    license={license}
                />
                <Subtitle config={config}/>
                <View
                    style={styles.thinLine}
                />
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.group}>
                    <Text
                        style={styles.leftHeading}
                        testID='about.app_version.title'
                    >
                        {intl.formatMessage({id: 'settings.about.app.version.title', defaultMessage: 'App Version:'})}
                    </Text>
                    <Text
                        style={styles.rightHeading}
                        testID='about.app_version.value'
                    >
                        {intl.formatMessage({id: 'settings.about.app.version.value', defaultMessage: '{version} (Build {number})'},
                            {version: nativeApplicationVersion, number: nativeBuildVersion})}
                    </Text>
                </View>
                <View style={styles.group}>
                    <Text
                        style={styles.leftHeading}
                        testID='about.server_version.title'
                    >
                        {intl.formatMessage({id: 'settings.about.server.version.title', defaultMessage: 'Server Version:'})}
                    </Text>
                    <Text
                        style={styles.rightHeading}
                        testID='about.server_version.value'
                    >
                        {serverVersion}
                    </Text>
                </View>
                {loadMetric !== null && (
                    <View style={styles.group}>
                        <Text
                            style={styles.leftHeading}
                            testID='about.license_load_metric.title'
                        >
                            {intl.formatMessage({id: 'settings.about.license.load_metric.title', defaultMessage: 'Load Metric:'})}
                        </Text>
                        <Text
                            style={styles.rightHeading}
                            testID='about.license_load_metric.value'
                        >
                            {loadMetric}
                        </Text>
                    </View>
                )}
                <View style={styles.group}>
                    <Text
                        style={styles.leftHeading}
                        testID='about.database.title'
                    >
                        {intl.formatMessage({id: 'settings.about.database.title', defaultMessage: 'Database:'})}
                    </Text>
                    <Text
                        style={styles.rightHeading}
                        testID='about.database.value'
                    >
                        {config.SQLDriverName}
                    </Text>
                </View>
                <View style={styles.group}>
                    <Text
                        style={styles.leftHeading}
                        testID='about.database_schema_version.title'
                    >
                        {intl.formatMessage({id: 'settings.about.database.schema.title', defaultMessage: 'Database Schema Version:'})}
                    </Text>
                    <Text
                        style={styles.rightHeading}
                        testID='about.database_schema_version.value'
                    >
                        {config.SchemaVersion}
                    </Text>
                </View>
                <View style={styles.copyInfoButtonContainer}>
                    <Button
                        theme={theme}
                        onPress={copyToClipboard}
                        text={intl.formatMessage({id: 'settings.about.button.copyInfo', defaultMessage: 'Copy info'})}
                        testID={'about.copy_info'}
                        iconName='content-copy'
                        emphasis='tertiary'
                        size='m'
                    />
                </View>
                {license?.IsLicensed === 'true' && (
                    <View style={styles.licenseContainer}>
                        <FormattedText
                            defaultMessage='Licensed to: {company}'
                            id={t('settings.about.licensed')}
                            style={styles.info}
                            testID='about.licensee'
                            values={{company: license.Company}}
                        />
                    </View>
                )}
                <LearnMore
                    config={config}
                    onPress={handleAboutTeam}
                />
                {!MATTERMOST_BUNDLE_IDS.includes(applicationId || '') &&
                    <FormattedText
                        defaultMessage='{site} is powered by Mattermost'
                        id={t('settings.about.powered_by')}
                        style={styles.footerText}
                        testID='about.powered_by'
                        values={{site: config.SiteName}}
                    />
                }
                <View
                    style={styles.thinLine}
                />
                <FormattedText
                    defaultMessage='Copyright 2015-{currentYear} Mattermost, Inc. All rights reserved'
                    id={t('settings.about.copyright')}
                    style={[styles.footerText, styles.copyrightText]}
                    testID='about.copyright'
                    values={{currentYear: new Date().getFullYear()}}
                />
                <View style={styles.tosPrivacyContainer}>
                    <TosPrivacyContainer
                        config={config}
                        onPressPrivacyPolicy={handlePrivacyPolicy}
                        onPressTOS={handleTermsOfService}
                    />
                </View>
                <View style={styles.noticeContainer}>
                    <FormattedText
                        id={t('settings.notice_text')}
                        defaultMessage='Mattermost is made possible by the open source software used in our {platform} and {mobile}.'
                        style={styles.footerText}
                        values={{
                            platform: (
                                <FormattedText
                                    defaultMessage='server'
                                    id={t('settings.notice_platform_link')}
                                    onPress={handlePlatformNotice}
                                    style={styles.noticeLink}
                                />
                            ),
                            mobile: (
                                <FormattedText
                                    defaultMessage='mobile apps'
                                    id={t('settings.notice_mobile_link')}
                                    onPress={handleMobileNotice}
                                    style={[styles.noticeLink, {marginLeft: 5}]}
                                />
                            ),
                        }}
                        testID='about.notice_text'
                    />
                </View>
                <View style={styles.hashContainer}>
                    <View>
                        <FormattedText
                            defaultMessage='Build Hash:'
                            id={t('about.hash')}
                            style={styles.footerTitleText}
                            testID='about.build_hash.title'
                        />
                        <Text
                            style={styles.footerText}
                            testID='about.build_hash.value'
                        >
                            {config.BuildHash}
                        </Text>
                    </View>
                    <View>
                        <FormattedText
                            defaultMessage='EE Build Hash:'
                            id={t('about.hashee')}
                            style={styles.footerTitleText}
                            testID='about.build_hash_enterprise.title'
                        />
                        <Text
                            style={styles.footerText}
                            testID='about.build_hash_enterprise.value'
                        >
                            {config.BuildHashEnterprise}
                        </Text>
                    </View>
                </View>
                <View style={{marginBottom: 20}}>
                    <FormattedText
                        defaultMessage='Build Date:'
                        id={t('about.date')}
                        style={styles.footerTitleText}
                        testID='about.build_date.title'
                    />
                    <Text
                        style={styles.footerText}
                        testID='about.build_date.value'
                    >
                        {config.BuildDate}
                    </Text>
                </View>
            </View>
        </SettingContainer>
    );
};

export default About;
