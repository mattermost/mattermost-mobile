// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderToString} from 'katex';
import React from 'react';
import {Text} from 'react-native';
import WebView from 'react-native-webview';

export function getKatexWebview(content, style, katexOptions, htmlStyleOptions) {
    try {
        const katexHtml = getKatexHtml(content, katexOptions, htmlStyleOptions);

        return (
            <WebView
                originWhitelist={['*']}
                source={{html: katexHtml}}
            />
        );
    } catch (e) {
        return (
            <Text
                id='katex.error'
                defaultMessage="Couldn't compile your Latex code. Please review the syntax and try again."
            />
        );
    }
}

function getKatexHtml(content, katexOptions, htmlStyleOptions) {
    const katexHtml = renderToString(content, katexOptions);

    //Convert style object to css string
    const styleString = Object.entries(htmlStyleOptions).map(([k, v]) => `${k}:${v}`).join(';');

    return `<!DOCTYPE html>
    <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.13.13/dist/katex.min.css" integrity="sha384-RZU/ijkSsFbcmivfdRBQDtwuwVqK7GMOw6IMvKyeWL2K5UAlyp6WonmB8m7Jd0Hn" crossorigin="anonymous">
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.13.13/dist/katex.min.js" integrity="sha384-pK1WpvzWVBQiP0/GjnvRxV4mOb0oxFuyRxJlk6vVw146n3egcN5C925NCP7a7BY8" crossorigin="anonymous"></script>
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.13.13/dist/contrib/auto-render.min.js" integrity="sha384-vZTG03m+2yp6N6BNi5iM4rW4oIwk5DfcNdFfxkk9ZWpDriOkXX8voJBFrAO7MpVl" crossorigin="anonymous"
                onload="renderMathInElement(document.body);"></script>
        </head>
        <style>
            .katexBox {${styleString}}
        </style>
        <span class="katexBox">
            ${katexHtml}
        </span>
    </html>`;
}
