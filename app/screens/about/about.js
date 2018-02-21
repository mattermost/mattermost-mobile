// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import AppIcon from 'app/components/app_icon';
import Config from 'assets/config';

const MATTERMOST_BUNDLE_IDS = ['com.mattermost.rnbeta', 'com.mattermost.rn'];

export default class About extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    handleAboutTeam = () => {
        Linking.openURL(Config.AboutTeamURL);
    };

    handleAboutEnterprise = () => {
        Linking.openURL(Config.AboutEnterpriseURL);
    };

    handlePlatformNotice = () => {
        Linking.openURL(Config.PlatformNoticeURL);
    };

    handleMobileNotice = () => {
        Linking.openURL(Config.MobileNoticeURL);
    };

    render() {
        const {theme, config, license} = this.props;
        const style = getStyleSheet(theme);

        let title = (
            <FormattedText
                id='about.teamEditiont0'
                defaultMessage='Team Edition'
                style={style.title}
            />
        );

        let subTitle = (
            <FormattedText
                id='about.teamEditionSt'
                defaultMessage='All your team communication in one place, instantly searchable and accessible anywhere.'
                style={style.subtitle}
            />
        );

        let learnMore = (
            <View style={style.learnContainer}>
                <FormattedText
                    id='about.teamEditionLearn'
                    defaultMessage='Join the Mattermost community at '
                    style={style.learn}
                />
                <TouchableOpacity
                    onPress={this.handleAboutTeam}
                >
                    <Text style={style.learnLink}>
                        {Config.TeamEditionLearnURL}
                    </Text>
                </TouchableOpacity>
            </View>
        );

        let licensee;
        if (config.BuildEnterpriseReady === 'true') {
            title = (
                <FormattedText
                    id='about.teamEditiont1'
                    defaultMessage='Enterprise Edition'
                    style={style.title}
                />
            );

            subTitle = (
                <FormattedText
                    id='about.enterpriseEditionSt'
                    defaultMessage='Modern communication from behind your firewall.'
                    style={style.subtitle}
                />
            );

            learnMore = (
                <View style={style.learnContainer}>
                    <FormattedText
                        id='about.enterpriseEditionLearn'
                        defaultMessage='Learn more about Enterprise Edition at '
                        style={style.learn}
                    />
                    <TouchableOpacity
                        onPress={this.handleAboutEnterprise}
                    >
                        <Text style={style.learnLink}>
                            {Config.EELearnURL}
                        </Text>
                    </TouchableOpacity>
                </View>
            );

            if (license.IsLicensed === 'true') {
                title = (
                    <FormattedText
                        id='about.enterpriseEditione1'
                        defaultMessage='Enterprise Edition'
                        style={style.title}
                    />
                );

                licensee = (
                    <View style={style.licenseContainer}>
                        <FormattedText
                            id='mobile.about.licensed'
                            defaultMessage='Licensed to: {company}'
                            style={style.info}
                            values={{
                                company: license.Company,
                            }}
                        />
                    </View>
                );
            }
        }

        let serverVersion;
        if (config.BuildNumber === config.Version) {
            serverVersion = (
                <FormattedText
                    id='mobile.about.serverVersionNoBuild'
                    defaultMessage='Server Version: {version}'
                    style={style.info}
                    values={{
                        version: config.Version,
                    }}
                />
            );
        } else {
            serverVersion = (
                <FormattedText
                    id='mobile.about.serverVersion'
                    defaultMessage='Server Version: {version} (Build {number})'
                    style={style.info}
                    values={{
                        version: config.Version,
                        number: config.BuildNumber,
                    }}
                />
            );
        }

        return (
            <View style={style.wrapper}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                >
                    <View style={style.logoContainer}>
                        <AppIcon
                            color={theme.centerChannelColor}
                            height={120}
                            width={120}
                        />
                    </View>
                    <View style={style.infoContainer}>
                        <View style={style.titleContainer}>
                            <Text style={style.title}>
                                {`${config.SiteName} `}
                            </Text>
                            {title}
                        </View>
                        {subTitle}
                        <FormattedText
                            id='mobile.about.appVersion'
                            defaultMessage='App Version: {version} (Build {number})'
                            style={style.info}
                            values={{
                                version: DeviceInfo.getVersion(),
                                number: DeviceInfo.getBuildNumber(),
                            }}
                        />
                        {serverVersion}
                        <FormattedText
                            id='mobile.about.database'
                            defaultMessage='Database: {type}'
                            style={style.info}
                            values={{
                                type: config.SQLDriverName,
                            }}
                        />
                        {licensee}
                        {learnMore}
                        {!MATTERMOST_BUNDLE_IDS.includes(DeviceInfo.getBundleId()) &&
                            <FormattedText
                                id='mobile.about.powered_by'
                                defaultMessage='{site} is powered by Mattermost'
                                style={style.footerText}
                                values={{
                                    site: this.props.config.SiteName,
                                }}
                            />
                        }
                        <FormattedText
                            id='mobile.about.copyright'
                            defaultMessage='Copyright 2015-{currentYear} Mattermost, Inc. All rights reserved'
                            style={style.footerText}
                            values={{
                                currentYear: new Date().getFullYear(),
                            }}
                        />
                        <View style={style.noticeContainer}>
                            <View style={style.footerGroup}>
                                <FormattedText
                                    id='mobile.notice_text'
                                    defaultMessage='Mattermost is made possible by the open source software used in our {platform} and {mobile}.'
                                    style={style.footerText}
                                    values={{
                                        platform: (
                                            <FormattedText
                                                id='mobile.notice_platform_link'
                                                defaultMessage='platform'
                                                style={style.noticeLink}
                                                onPress={this.handlePlatformNotice}
                                            />
                                        ),
                                        mobile: (
                                            <FormattedText
                                                id='mobile.notice_mobile_link'
                                                defaultMessage='mobile apps'
                                                style={[style.noticeLink, {marginLeft: 5}]}
                                                onPress={this.handleMobileNotice}
                                            />
                                        ),
                                    }}
                                />
                            </View>
                        </View>
                        <View style={style.hashContainer}>
                            <View style={style.footerGroup}>
                                <FormattedText
                                    id='about.hash'
                                    defaultMessage='Build Hash:'
                                    style={style.footerText}
                                />
                                <Text style={style.footerText}>
                                    {'\u00a0' + config.BuildHash}
                                </Text>
                            </View>
                            <View style={style.footerGroup}>
                                <FormattedText
                                    id='about.hashee'
                                    defaultMessage='EE Build Hash:'
                                    style={style.footerText}
                                />
                                <Text style={style.footerText}>
                                    {'\u00a0' + config.BuildHashEnterprise}
                                </Text>
                            </View>
                        </View>
                        <View style={style.footerGroup}>
                            <FormattedText
                                id='about.date'
                                defaultMessage='Build Date:'
                                style={style.footerText}
                            />
                            <Text style={style.footerText}>
                                {'\u00a0' + config.BuildDate}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        wrapper: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
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
            flexDirection: 'row',
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
        learnContainer: {
            flex: 1,
            flexDirection: 'column',
            marginVertical: 20,
        },
        learn: {
            color: theme.centerChannelColor,
            fontSize: 16,
        },
        learnLink: {
            color: theme.linkColor,
            fontSize: 16,
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
            flexDirection: 'row',
        },
        footerText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
            lineHeight: 13,
            marginBottom: 10,
        },
    };
});
