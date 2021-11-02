// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type LoginOptionWithConfigProps = {
    ssoType?: string;
    config: ClientConfig;
    onPress: (type: string|GestureResponderEvent) => void | (() => void);
    theme: Theme;
}

type LoginOptionWithConfigAndLicenseProps = LoginOptionWithConfigProps & {
    license?: ClientLicense;
};
