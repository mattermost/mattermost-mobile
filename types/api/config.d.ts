// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface ClientConfig {
    AboutLink: string;
    AllowBannerDismissal: string;
    AllowCustomThemes: string;
    AllowEditPost: string;
    AllowedThemes: string;
    AndroidAppDownloadLink: string;
    AndroidLatestVersion: string;
    AndroidMinVersion: string;
    AppDownloadLink: string;
    AsymmetricSigningPublicKey: string;
    AvailableLocales: string;
    BannerColor: string;
    BannerText: string;
    BannerTextColor: string;
    BuildDate: string;
    BuildEnterpriseReady: string;
    BuildHash: string;
    BuildHashEnterprise: string;
    BuildNumber: string;
    CloseUnusedDirectMessages: string;
    CollapsedThreads: string;
    CustomBrandText: string;
    CustomDescriptionText: string;
    CustomTermsOfServiceId: string;
    CustomTermsOfServiceReAcceptancePeriod: string;
    CustomUrlSchemes: string;
    DataRetentionEnableFileDeletion: string;
    DataRetentionEnableMessageDeletion: string;
    DataRetentionFileRetentionDays: string;
    DataRetentionMessageRetentionDays: string;
    DefaultClientLocale: string;
    DefaultTheme: string;
    DelayChannelAutocomplete: 'true' | 'false';
    DesktopLatestVersion: string;
    DesktopMinVersion: string;
    DiagnosticId: string;
    DiagnosticsEnabled: string;
    EmailLoginButtonBorderColor: string;
    EmailLoginButtonColor: string;
    EmailLoginButtonTextColor: string;
    EmailNotificationContentsType: string;
    EnableBanner: string;
    EnableBotAccountCreation: string;
    EnableChannelViewedMessages: string;
    EnableClientMetrics?: string;
    EnableCluster: string;
    EnableCommands: string;
    EnableCompliance: string;
    EnableConfirmNotificationsToChannel: string;
    EnableCustomBrand: string;
    EnableCustomEmoji: string;
    EnableCustomTermsOfService: string;
    EnableCustomUserStatuses: string;
    EnableDeveloper: string;
    EnableDiagnostics: string;
    EnableEmailBatching: string;
    EnableEmailInvitations: string;
    EnableEmojiPicker: string;
    EnableFileAttachments: string;
    EnableGifPicker: string;
    EnableGuestAccounts: string;
    EnableIncomingWebhooks: string;
    EnableInlineLatex: string;
    EnableLatex: string;
    EnableLdap: string;
    EnableLinkPreviews: string;
    EnableMarketplace: string;
    EnableMetrics: string;
    EnableMobileFileDownload: string;
    EnableMobileFileUpload: string;
    EnableMultifactorAuthentication: string;
    EnableOAuthServiceProvider: string;
    EnableOpenServer: string;
    EnableOutgoingWebhooks: string;
    EnablePostIconOverride: string;
    EnablePostUsernameOverride: string;
    EnablePreviewFeatures: string;
    EnablePreviewModeBanner: string;
    EnablePublicLink: string;
    EnableReliableWebSockets: string;
    EnableSVGs: string;
    EnableSaml: string;
    EnableSignInWithEmail: string;
    EnableSignInWithUsername: string;
    EnableSignUpWithEmail: string;
    EnableSignUpWithGitLab: string;
    EnableSignUpWithGoogle: string;
    EnableSignUpWithOffice365: string;
    EnableSignUpWithOpenId: string;
    EnableTesting: string;
    EnableThemeSelection: string;
    EnableTutorial: string;
    EnableUserAccessTokens: string;
    EnableUserCreation: string;
    EnableUserDeactivation: string;
    EnableUserTypingMessages: string;
    EnableXToLeaveChannelsFromLHS: string;
    EnforceMultifactorAuthentication: string;
    ExperimentalChannelOrganization: string;
    ExperimentalChannelSidebarOrganization: string;
    ExperimentalClientSideCertCheck: string;
    ExperimentalClientSideCertEnable: string;
    ExperimentalEnableAuthenticationTransfer: string;
    ExperimentalEnableAutomaticReplies: string;
    ExperimentalEnableClickToReply: string;
    ExperimentalEnableDefaultChannelLeaveJoinMessages: string;
    ExperimentalEnablePostMetadata: string;
    ExperimentalGroupUnreadChannels: string;
    ExperimentalHideTownSquareinLHS: string;
    ExperimentalNormalizeMarkdownLinks: string;
    ExperimentalPrimaryTeam: string;
    ExperimentalSharedChannels: string;
    ExperimentalTownSquareIsReadOnly: string;
    ExperimentalViewArchivedChannels: string;
    ExtendSessionLengthWithActivity: string;
    FeatureFlagAppsEnabled?: string;
    FeatureFlagCollapsedThreads?: string;
    FeatureFlagPostPriority?: string;
    FeatureFlagChannelBookmarks?: string;
    ForgotPasswordLink?: string;
    GfycatApiKey: string;
    GfycatApiSecret: string;
    GoogleDeveloperKey: string;
    GuestAccountsEnforceMultifactorAuthentication: string;
    HasImageProxy: string;
    HelpLink: string;
    HideGuestTags: string;
    IosAppDownloadLink: string;
    IosLatestVersion: string;
    IosMinVersion: string;
    LdapFirstNameAttributeSet: string;
    LdapLastNameAttributeSet: string;
    LdapLoginButtonBorderColor: string;
    LdapLoginButtonColor: string;
    LdapLoginButtonTextColor: string;
    LdapLoginFieldName: string;
    LdapNicknameAttributeSet: string;
    LdapPictureAttributeSet: string;
    LdapPositionAttributeSet: string;
    LockTeammateNameDisplay: string;
    MaxFileSize: string;
    MaxMarkdownNodes: string;
    MaxNotificationsPerChannel: string;
    MaxPostSize: string;
    MinimumHashtagLength: string;
    MobileExternalBrowser: string;
    OpenIdButtonColor: string;
    OpenIdButtonText: string;
    PasswordEnableForgotLink: string;
    PasswordMinimumLength: string;
    PasswordRequireLowercase: string;
    PasswordRequireNumber: string;
    PasswordRequireSymbol: string;
    PasswordRequireUppercase: string;
    PluginsEnabled: string;
    PostEditTimeLimit: string;
    PostPriority: string;
    PostAcknowledgements: string;
    AllowPersistentNotifications: string;
    PersistentNotificationMaxRecipients: string;
    PersistentNotificationInterval: string;
    AllowPersistentNotificationsForGuests: string;
    PersistentNotificationIntervalMinutes: string;
    PrivacyPolicyLink: string;
    ReportAProblemLink: string;
    RequireEmailVerification: string;
    RestrictDirectMessage: string;
    RunJobs: string;
    SQLDriverName: string;
    SamlFirstNameAttributeSet: string;
    SamlLastNameAttributeSet: string;
    SamlLoginButtonBorderColor: string;
    SamlLoginButtonColor: string;
    SamlLoginButtonText: string;
    SamlLoginButtonTextColor: string;
    SamlNicknameAttributeSet: string;
    SamlPositionAttributeSet: string;
    SchemaVersion: string;
    SendEmailNotifications: string;
    SendPushNotifications: string;
    ShowEmailAddress: string;
    ShowFullName: string;
    SiteName: string;
    SiteURL: string;
    SupportEmail: string;
    TeammateNameDisplay: string;
    TelemetryId: string;
    TermsOfServiceLink: string;
    TimeBetweenUserTypingUpdatesMilliseconds: string;
    Version: string;
    WebsocketPort: string;
    WebsocketSecurePort: string;
    WebsocketURL: string;
}
