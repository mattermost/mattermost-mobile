// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, View} from 'react-native';
import Mailer from 'react-native-mail';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import SettingContainer from '@screens/settings/setting_container';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import SettingItem from './setting_item';
const CLOSE_BUTTON_ID = 'close-settings';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        containerStyle: {
            paddingLeft: 8,
            marginTop: 12,
        },
        helpGroup: {
            width: '91%',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
            alignSelf: 'center',

            // marginTop: 20,
        },
    };
});

type SettingsProps = {
    componentId: string;
    helpLink: string;
    showHelp: boolean;
    siteName: string;
}

//todo: Profile the whole feature - https://mattermost.atlassian.net/browse/MM-39711

const Settings = ({componentId, helpLink, showHelp, siteName}: SettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverDisplayName = useServerDisplayName();

    const serverName = siteName || serverDisplayName;
    const styles = getStyleSheet(theme);

    const closeButton = useMemo(() => {
        return {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: 'close.settings.button',
        };
    }, [theme.centerChannelColor]);

    const close = () => {
        dismissModal({componentId});
    };

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [closeButton],
        });
    }, []);

    useAndroidHardwareBackHandler(componentId, close);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, []);

    const goToNotifications = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_NOTIFICATION;
        const title = intl.formatMessage({id: 'settings.notifications', defaultMessage: 'Notifications'});

        goToScreen(screen, title);
    });

    const goToDisplaySettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY;
        const title = intl.formatMessage({id: 'settings.display', defaultMessage: 'Display'});

        goToScreen(screen, title);
    });

    const goToAbout = preventDoubleTap(() => {
        const screen = Screens.ABOUT;
        const title = intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName});

        goToScreen(screen, title);
    });

    const goToAdvancedSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_ADVANCED;
        const title = intl.formatMessage({id: 'settings.advanced_settings', defaultMessage: 'Advanced Settings'});

        goToScreen(screen, title);
    });

    const openHelp = preventDoubleTap(() => {
        const link = helpLink ? helpLink.toLowerCase() : '';

        if (link) {
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({id: 'mobile.link.error.title', defaultMessage: 'Error'}),
                    intl.formatMessage({id: 'mobile.link.error.text', defaultMessage: 'Unable to open the link.'}),
                );
            };

            tryOpenURL(link, onError);
        }
    });

    const openEmailClient = preventDoubleTap(() => {
        Mailer.mail({
            subject: 'need help',
            recipients: ['support@example.com'],
            ccRecipients: ['supportCC@example.com'],
            bccRecipients: ['supportBCC@example.com'],
            body: '<b>A Bold Body</b>',

            // customChooserTitle: 'This is my new title', // Android only (defaults to "Send Mail")
            // isHTML: true,

            // attachments: [{

            //     // Specify either `path` or `uri` to indicate where to find the file data.
            //     // The API used to create or locate the file will usually indicate which it returns.
            //     // An absolute path will look like: /cacheDir/photos/some image.jpg
            //     // A URI starts with a protocol and looks like: content://appname/cacheDir/photos/some%20image.jpg
            //     path: '', // The absolute path of the file from which to read data.
            //     uri: '', // The uri of the file from which to read the data.
            //     // Specify either `type` or `mimeType` to indicate the type of data.
            //     type: '', // Mime Type: jpg, png, doc, ppt, html, pdf, csv
            //     mimeType: '', // - use only if you want to use custom type
            //     name: '', // Optional: Custom filename for attachment
            // }],
        }, () => {
            // fixme: error : not_available => verify if the default email client has been configured or ask the user to do so and to try again later

            // Alert.alert(
            //     error,
            //     event,
            //     [
            //         {text: 'Ok', onPress: () => console.log('OK: Email Error Response', {error, event})},
            //         {text: 'Cancel', onPress: () => console.log('CANCEL: Email Error Response')},
            //     ],
            //     {cancelable: true},
            // );
        });
    });

    return (
        <SettingContainer testID='settings'>
            <SettingItem
                onPress={goToNotifications}
                optionName='notification'
                testID='settings.notifications.option'
            />
            <SettingItem
                onPress={goToDisplaySettings}
                optionName='display'
                testID='settings.display.option'
            />
            <SettingItem
                onPress={goToAdvancedSettings}
                optionName='advanced_settings'
                testID='settings.advanced_settings.option'
            />
            <SettingItem
                icon='information-outline'
                label={intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName})}
                onPress={goToAbout}
                optionName='about'
                testID='settings.about.option'
            />
            {Platform.OS === 'android' && <View style={styles.helpGroup}/>}
            {showHelp &&
                <SettingItem
                    optionLabelTextStyle={{color: theme.linkColor}}
                    onPress={openHelp}
                    optionName='help'
                    separator={false}
                    testID='settings.help.option'
                    type='default'
                />
            }
            <SettingItem
                optionLabelTextStyle={{color: theme.linkColor}}
                onPress={openEmailClient}
                optionName='report_problem'
                separator={false}
                testID='settings.report.problem'
                type='default'
            />
        </SettingContainer>
    );
};

export default Settings;
