// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GeneralSettingsScreen} from '@support/ui/screen';

class AboutScreen {
    testID = {
        aboutScreen: 'about.screen',
        aboutScrollView: 'about.scroll_view',
        backButton: 'screen.back.button',
        aboutAppVersion: 'about.app_version',
        aboutBuildDateTitle: 'about.build_date.title',
        aboutBuildDateValue: 'about.build_date.value',
        aboutBuildHashEnterpriseTitle: 'about.build_hash_enterprise.title',
        aboutBuildHashEnterpriseValue: 'about.build_hash_enterprise.value',
        aboutBuildHashTitle: 'about.build_hash.title',
        aboutBuildHashValue: 'about.build_hash.value',
        aboutCopyRight: 'about.copyright',
        aboutDatabase: 'about.database',
        aboutNoticeText: 'about.notice_text',
        aboutLearnMore: 'about.learn_more',
        aboutLearnMoreUrl: 'about.learn_more.url',
        aboutLicensee: 'about.licensee',
        aboutLogo: 'about.logo',
        aboutPoweredBy: 'about.powered_by',
        aboutPrivacyPolicy: 'about.privacy_policy',
        aboutServerVersion: 'about.server_version',
        aboutSiteName: 'about.site_name',
        aboutSubtitle: 'about.subtitle',
        aboutTermsOfService: 'about.terms_of_service',
        aboutTitle: 'about.title',
    }

    aboutScreen = element(by.id(this.testID.aboutScreen));
    aboutScrollView = element(by.id(this.testID.aboutScrollView));
    backButton = element(by.id(this.testID.backButton));
    aboutAppVersion = element(by.id(this.testID.aboutAppVersion));
    aboutBuildDateTitle = element(by.id(this.testID.aboutBuildDateTitle));
    aboutBuildDateValue = element(by.id(this.testID.aboutBuildDateValue));
    aboutBuildHashEnterpriseTitle = element(by.id(this.testID.aboutBuildHashEnterpriseTitle));
    aboutBuildHashEnterpriseValue = element(by.id(this.testID.aboutBuildHashEnterpriseValue));
    aboutBuildHashTitle = element(by.id(this.testID.aboutBuildHashTitle));
    aboutBuildHashValue = element(by.id(this.testID.aboutBuildHashValue));
    aboutCopyRight = element(by.id(this.testID.aboutCopyRight));
    aboutDatabase = element(by.id(this.testID.aboutDatabase));
    aboutNoticeText = element(by.id(this.testID.aboutNoticeText));
    aboutLearnMore = element(by.id(this.testID.aboutLearnMore));
    aboutLearnMoreUrl = element(by.id(this.testID.aboutLearnMoreUrl));
    aboutLicensee = element(by.id(this.testID.aboutLicensee));
    aboutLogo = element(by.id(this.testID.aboutLogo));
    aboutPoweredBy = element(by.id(this.testID.aboutPoweredBy));
    aboutPrivacyPolicy = element(by.id(this.testID.aboutPrivacyPolicy));
    aboutServerVersion = element(by.id(this.testID.aboutServerVersion));
    aboutSiteName = element(by.id(this.testID.aboutSiteName));
    aboutSubtitle = element(by.id(this.testID.aboutSubtitle));
    aboutTermsOfService = element(by.id(this.testID.aboutTermsOfService));
    aboutTitle = element(by.id(this.testID.aboutTitle));

    toBeVisible = async () => {
        await expect(this.aboutScreen).toBeVisible();

        return this.aboutScreen;
    }

    open = async () => {
        // # Open about screen
        await GeneralSettingsScreen.aboutAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.aboutScreen).not.toBeVisible();
    }
}

const aboutScreen = new AboutScreen();
export default aboutScreen;
