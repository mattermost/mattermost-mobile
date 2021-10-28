// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, ScrollView, Text, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {SafeAreaView} from 'react-native-safe-area-context';

import Config from '@assets/config.json';
import AppVersion from '@components/app_version';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import AboutLinks from '@constants/about_links';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import LearnMore from './learn_more';
import ServerVersion from './server_version';
import Subtitle from './subtitle';
import Title from './title';
import TosPrivacyContainer from './tos_privacy';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const MATTERMOST_BUNDLE_IDS = ['com.mattermost.rnbeta', 'com.mattermost.rn'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingBottom: 30,
        },
        logoContainer: {
            alignItems: 'center',
            flex: 1,
            height: 200,
            paddingVertical: 40,
        },
        infoContainer: {
            flex: 1,
            flexDirection: 'column',
            paddingHorizontal: 20,
        },
        titleContainer: {
            flex: 1,
            marginBottom: 20,
        },
        title: {
            fontSize: 22,
            color: theme.centerChannelColor,
        },
        subtitle: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 19,
            marginBottom: 15,
        },
        info: {
            color: theme.centerChannelColor,
            fontSize: 16,
            lineHeight: 19,
        },
        licenseContainer: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 20,
        },
        noticeContainer: {
            flex: 1,
            flexDirection: 'column',
        },
        noticeLink: {
            color: theme.linkColor,
            fontSize: 11,
            lineHeight: 13,
        },
        hashContainer: {
            flex: 1,
            flexDirection: 'column',
        },
        footerGroup: {
            flex: 1,
        },
        footerTitleText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
            fontFamily: 'OpenSans-Semibold',
            lineHeight: 13,
        },
        footerText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
            lineHeight: 13,
            marginBottom: 10,
        },
        copyrightText: {
            marginBottom: 0,
        },
        tosPrivacyContainer: {
            flex: 1,
            flexDirection: 'row',
            marginBottom: 10,
        },
    };
});

type ConnectedAboutProps = {
    config: SystemModel;
    license: SystemModel;
}

const ConnectedAbout = ({config, license}: ConnectedAboutProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const openURL = useCallback((url: string) => {
        const onError = () => {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                intl.formatMessage({
                    id: 'mobile.link.error.text',
                    defaultMessage: 'Unable to open the link.',
                }),
            );
        };

        tryOpenURL(url, onError);
    }, []);

    const handleAboutTeam = useCallback(preventDoubleTap(() => {
        return openURL(Config.AboutTeamURL);
    }), []);

    const handleAboutEnterprise = useCallback(preventDoubleTap(() => {
        return openURL(Config.AboutEnterpriseURL);
    }), []);

    const handlePlatformNotice = useCallback(preventDoubleTap(() => {
        return openURL(Config.PlatformNoticeURL);
    }), []);

    const handleMobileNotice = useCallback(preventDoubleTap(() => {
        return openURL(Config.MobileNoticeURL);
    }), []);

    const handleTermsOfService = useCallback(preventDoubleTap(() => {
        return openURL(AboutLinks.TERMS_OF_SERVICE);
    }), []);

    const handlePrivacyPolicy = useCallback(preventDoubleTap(() => {
        return openURL(AboutLinks.PRIVACY_POLICY);
    }), []);

    return (
        <SafeAreaView
            edges={['left', 'right']}
            style={style.container}
            testID='about.screen'
        >
            <ScrollView
                style={style.scrollView}
                contentContainerStyle={style.scrollViewContent}
                testID='about.scroll_view'
            >
                <View style={style.logoContainer}>
                    <CompassIcon
                        name='mattermost'
                        color={theme.centerChannelColor}
                        size={120}
                        testID='about.logo'
                    />
                </View>
                <View style={style.infoContainer}>
                    <View style={style.titleContainer}>
                        <Text
                            style={style.title}
                            testID='about.site_name'
                        >
                            {`${config.value.SiteName} `}
                        </Text>
                        <Title
                            config={config}
                            license={license}
                        />
                    </View>
                    <Subtitle config={config}/>
                    <AppVersion
                        isWrapped={false}
                        textStyle={style.info}
                    />
                    <ServerVersion config={config}/>
                    <FormattedText
                        id={t('mobile.about.database')}
                        defaultMessage='Database: {type}'
                        style={style.info}
                        values={{
                            type: config.value.SQLDriverName,
                        }}
                        testID='about.database'
                    />
                    {license.value.IsLicensed === 'true' && (
                        <View style={style.licenseContainer}>
                            <FormattedText
                                id={t('mobile.about.licensed')}
                                defaultMessage='Licensed to: {company}'
                                style={style.info}
                                values={{
                                    company: license.value.Company,
                                }}
                                testID='about.licensee'
                            />
                        </View>
                    )}
                    <LearnMore
                        config={config}
                        onHandleAboutEnterprise={handleAboutEnterprise}
                        onHandleAboutTeam={handleAboutTeam}
                    />
                    {!MATTERMOST_BUNDLE_IDS.includes(DeviceInfo.getBundleId()) &&
                    <FormattedText
                        id={t('mobile.about.powered_by')}
                        defaultMessage='{site} is powered by Mattermost'
                        style={style.footerText}
                        values={{
                            site: config.value.SiteName,
                        }}
                        testID='about.powered_by'
                    />
                    }
                    <FormattedText
                        id={t('mobile.about.copyright')}
                        defaultMessage='Copyright 2015-{currentYear} Mattermost, Inc. All rights reserved'
                        style={[style.footerText, style.copyrightText]}
                        values={{
                            currentYear: new Date().getFullYear(),
                        }}
                        testID='about.copyright'
                    />
                    <View style={style.tosPrivacyContainer}>
                        <TosPrivacyContainer
                            config={config}
                            onPressTOS={handleTermsOfService}
                            onPressPrivacyPolicy={handlePrivacyPolicy}
                        />
                    </View>
                    <View style={style.noticeContainer}>
                        <View style={style.footerGroup}>
                            <FormattedText
                                id={t('mobile.notice_text')}
                                defaultMessage='Mattermost is made possible by the open source software used in our {platform} and {mobile}.'
                                style={style.footerText}
                                values={{
                                    platform: (
                                        <FormattedText
                                            id={t('mobile.notice_platform_link')}
                                            defaultMessage='server'
                                            style={style.noticeLink}
                                            onPress={handlePlatformNotice}
                                        />
                                    ),
                                    mobile: (
                                        <FormattedText
                                            id={t('mobile.notice_mobile_link')}
                                            defaultMessage='mobile apps'
                                            style={[style.noticeLink, {marginLeft: 5}]}
                                            onPress={handleMobileNotice}
                                        />
                                    ),
                                }}
                                testID='about.notice_text'
                            />
                        </View>
                    </View>
                    <View style={style.hashContainer}>
                        <View style={style.footerGroup}>
                            <FormattedText
                                id={t('about.hash')}
                                defaultMessage='Build Hash:'
                                style={style.footerTitleText}
                                testID='about.build_hash.title'
                            />
                            <Text
                                style={style.footerText}
                                testID='about.build_hash.value'
                            >
                                {config.value.BuildHash}
                            </Text>
                        </View>
                        <View style={style.footerGroup}>
                            <FormattedText
                                id={t('about.hashee')}
                                defaultMessage='EE Build Hash:'
                                style={style.footerTitleText}
                                testID='about.build_hash_enterprise.title'
                            />
                            <Text
                                style={style.footerText}
                                testID='about.build_hash_enterprise.value'
                            >
                                {config.value.BuildHashEnterprise}
                            </Text>
                        </View>
                    </View>
                    <View style={style.footerGroup}>
                        <FormattedText
                            id={t('about.date')}
                            defaultMessage='Build Date:'
                            style={style.footerTitleText}
                            testID='about.build_date.title'
                        />
                        <Text
                            style={style.footerText}
                            testID='about.build_date.value'
                        >
                            {config.value.BuildDate}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    config: database.collections.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
    license: database.collections.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE),
}));

export default withDatabase(enhanced(ConnectedAbout));
