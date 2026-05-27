// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';

class AboutScreen {
    testID = {
        aboutScreen: 'about.screen',
        backButton: 'navigation.header.back',
        scrollView: 'about.scroll_view',
        logo: 'about.logo',
        title: 'about.title',
        subtitle: 'about.subtitle',
        appVersionTitle: 'about.app_version.title',
        appVersionValue: 'about.app_version.value',
        serverVersionTitle: 'about.server_version.title',
        serverVersionValue: 'about.server_version.value',
        licenseLoadMetricTitle: 'about.license_load_metric.title',
        licenseLoadMetricValue: 'about.license_load_metric.value',
        databaseTitle: 'about.database.title',
        databaseValue: 'about.database.value',
        databaseSchemaVersionTitle: 'about.database_schema_version.title',
        databaseSchemaVersionValue: 'about.database_schema_version.value',
        copInfoButton: 'about.copy_info',
        licensee: 'about.licensee',
        learnMoreText: 'about.learn_more.text',
        learnMoreUrl: 'about.learn_more.url',
        poweredBy: 'about.powered_by',
        copyright: 'about.copyright',
        termsOfService: 'about.terms_of_service',
        privacyPolicy: 'about.privacy_policy',
        noticeText: 'about.notice_text',
        buildHashTitle: 'about.build_hash.title',
        buildHashValue: 'about.build_hash.value',
        buildHashEnterpriseTitle: 'about.build_hash_enterprise.title',
        buildHashEnterpriseValue: 'about.build_hash_enterprise.value',
        buildDateTitle: 'about.build_date.title',
        buildDateValue: 'about.build_date.value',
    };

    aboutScreen = element(by.id(this.testID.aboutScreen));

    // About is an expo-router stack screen (app/routes/(modals)/(settings)/about.tsx
    // uses `getHeaderOptions(theme)` via useNavigationHeader). The custom
    // NavigationHeader's `navigation.header.back` testID is NOT rendered here on
    // either platform — verified by grep: that testID only appears in
    // `app/components/navigation_header/header.tsx`, which neither About nor any
    // expo-router native-stack screen uses. The chevron is owned by
    // @react-navigation/native-stack: iOS surfaces it via
    // `accessibilityLabel="Back"`, Android via the AppCompat Toolbar's default
    // navigation-icon contentDescription `Navigate up` (react-native-screens
    // doesn't override it — confirmed by searching ScreenStackHeaderConfig.kt
    // for setNavigationContentDescription).
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

    scrollView = element(by.id(this.testID.scrollView));
    logo = element(by.id(this.testID.logo));
    title = element(by.id(this.testID.title));
    subtitle = element(by.id(this.testID.subtitle));
    appVersionTitle = element(by.id(this.testID.appVersionTitle));
    appVersionValue = element(by.id(this.testID.appVersionValue));
    serverVersionTitle = element(by.id(this.testID.serverVersionTitle));
    serverVersionValue = element(by.id(this.testID.serverVersionValue));
    licenseLoadMetricTitle = element(by.id(this.testID.licenseLoadMetricTitle));
    licenseLoadMetricValue = element(by.id(this.testID.licenseLoadMetricValue));
    databaseTitle = element(by.id(this.testID.databaseTitle));
    databaseValue = element(by.id(this.testID.databaseValue));
    copyInfoButton = element(by.id(this.testID.copInfoButton));
    databaseSchemaVersionTitle = element(by.id(this.testID.databaseSchemaVersionTitle));
    databaseSchemaVersionValue = element(by.id(this.testID.databaseSchemaVersionValue));
    licensee = element(by.id(this.testID.licensee));
    learnMoreText = element(by.id(this.testID.learnMoreText));
    learnMoreUrl = element(by.id(this.testID.learnMoreUrl));
    poweredBy = element(by.id(this.testID.poweredBy));
    copyright = element(by.id(this.testID.copyright));
    termsOfService = element(by.id(this.testID.termsOfService));
    privacyPolicy = element(by.id(this.testID.privacyPolicy));
    noticeText = element(by.id(this.testID.noticeText));
    buildHashTitle = element(by.id(this.testID.buildHashTitle));
    buildHashValue = element(by.id(this.testID.buildHashValue));
    buildHashEnterpriseTitle = element(by.id(this.testID.buildHashEnterpriseTitle));
    buildHashEnterpriseValue = element(by.id(this.testID.buildHashEnterpriseValue));
    buildDateTitle = element(by.id(this.testID.buildDateTitle));
    buildDateValue = element(by.id(this.testID.buildDateValue));

    toBeVisible = async () => {
        await waitFor(this.aboutScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.aboutScreen;
    };

    open = async () => {
        // # Open about screen
        await SettingsScreen.aboutOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        // Use platform-native back chevron: Android via device.pressBack(),
        // iOS via by.label('Back'). The custom NavigationHeader's testID
        // does not exist on this screen (expo-router native stack).
        await tapNativeBackButton();
        await waitFor(this.aboutScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const aboutScreen = new AboutScreen();
export default aboutScreen;
