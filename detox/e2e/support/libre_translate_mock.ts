// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Helper to control the LibreTranslate mock (detox/mock_libre_translate.js) from e2e tests.
 * Use this to set the detected source language so messages are translated (or not) as needed.
 *
 * Start the mock before running auto-translation tests:
 *   node detox/mock_libre_translate.js
 *
 * Mock endpoints:
 *   POST /__control/source  body: { "language": "es" }  - set detected source language
 */

import axios from 'axios';

import {libreTranslateMockUrl} from './test_config';

/**
 * Set the detected source language returned by the mock for /detect and for /translate when source=auto.
 * @param baseUrl - mock base URL (default from test_config)
 * @param language - language code e.g. 'es', 'en', 'fr', 'de'
 * @returns response with { ok, language } or throws on failure
 */
export const setMockSourceLanguage = async (
    baseUrl: string = libreTranslateMockUrl,
    language: string,
): Promise<{ok: boolean; language: string}> => {
    const {data} = await axios.post(
        `${baseUrl.replace(/\/$/, '')}/__control/source`,
        {language},
        {timeout: 5000, validateStatus: () => true},
    );
    if (data?.ok !== true) {
        throw new Error(`LibreTranslate mock setMockSourceLanguage failed: ${JSON.stringify(data)}`);
    }
    return data;
};

export default {
    setMockSourceLanguage,
};
