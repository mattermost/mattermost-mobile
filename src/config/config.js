// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import BaseConfig from '../../config/config.json';
import SecretConfig from '../../config/config.secret.json';

const Config = {
    ...BaseConfig,
    ...SecretConfig
};

export default Config;