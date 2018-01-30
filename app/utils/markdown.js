// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Dimensions, PixelRatio, Platform, StyleSheet} from 'react-native';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export function getCodeFont() {
    return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
}

const scale = Dimensions.get('window').width / 320;

export const normalizeFontSizeByDevice = (size) => {
    const normalized = Math.ceil(PixelRatio.roundToNearestPixel(size * scale));
    return Platform.OS === 'ios' ? normalized : normalized + 4;
};

export const getMarkdownTextStyles = makeStyleSheetFromTheme((theme) => {
    const codeFont = getCodeFont();

    return {
        emph: {
            fontStyle: 'italic'
        },
        strong: {
            fontWeight: 'bold'
        },
        del: {
            textDecorationLine: 'line-through'
        },
        link: {
            color: theme.linkColor
        },
        heading1: {
            fontSize: normalizeFontSizeByDevice(17),
            fontWeight: '700',
            lineHeight: normalizeFontSizeByDevice(25)
        },
        heading2: {
            fontSize: normalizeFontSizeByDevice(17),
            fontWeight: '700',
            lineHeight: normalizeFontSizeByDevice(25)
        },
        heading3: {
            fontSize: normalizeFontSizeByDevice(17),
            fontWeight: '700',
            lineHeight: normalizeFontSizeByDevice(25)
        },
        heading4: {
            fontSize: normalizeFontSizeByDevice(17),
            fontWeight: '700',
            lineHeight: normalizeFontSizeByDevice(25)
        },
        heading5: {
            fontSize: normalizeFontSizeByDevice(17),
            fontWeight: '700',
            lineHeight: normalizeFontSizeByDevice(25)
        },
        heading6: {
            fontSize: normalizeFontSizeByDevice(17),
            fontWeight: '700',
            lineHeight: normalizeFontSizeByDevice(25)
        },
        text: {
            fontSize: normalizeFontSizeByDevice(15),
            lineHeight: normalizeFontSizeByDevice(23)
        },
        code: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            fontFamily: codeFont
        },
        codeBlock: {
            fontFamily: codeFont
        },
        mention: {
            color: theme.linkColor
        },
        error: {
            color: theme.errorTextColor
        }
    };
});

export const getMarkdownBlockStyles = makeStyleSheetFromTheme((theme) => {
    return {
        adjacentParagraph: {
            marginTop: 6
        },
        horizontalRule: {
            backgroundColor: theme.centerChannelColor,
            height: StyleSheet.hairlineWidth,
            flex: 1,
            marginVertical: 10
        },
        quoteBlockIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            padding: 5
        }
    };
});

const languages = {
    actionscript: 'ActionScript',
    applescript: 'AppleScript',
    bash: 'Bash',
    clojure: 'Clojure',
    coffeescript: 'CoffeeScript',
    cpp: 'C++',
    cs: 'C#',
    css: 'CSS',
    d: 'D',
    dart: 'Dart',
    delphi: 'Delphi',
    diff: 'Diff',
    django: 'Django',
    dockerfile: 'Dockerfile',
    erlang: 'Erlang',
    fortran: 'Fortran',
    fsharp: 'F#',
    gcode: 'G-code',
    go: 'Go',
    groovy: 'Groovy',
    handlebars: 'Handlebars',
    haskell: 'Haskell',
    haxe: 'Haxe',
    html: 'HTML',
    java: 'Java',
    javascript: 'JavaScript',
    json: 'JSON',
    julia: 'Julia',
    kotlin: 'Kotlin',
    latex: 'LaTeX',
    less: 'Less',
    lisp: 'Lisp',
    lua: 'Lua',
    makefile: 'Makefile',
    markdown: 'Markdown',
    matlab: 'Matlab',
    objectivec: 'Objective-C',
    ocaml: 'OCaml',
    perl: 'Perl',
    php: 'PHP',
    powershell: 'PowerShell',
    puppet: 'Puppet',
    python: 'Python',
    r: 'R',
    ruby: 'Ruby',
    rust: 'Rust',
    scala: 'Scala',
    scheme: 'Scheme',
    scss: 'SCSS',
    smalltalk: 'Smalltalk',
    sql: 'SQL',
    swift: 'Swift',
    tex: 'TeX',
    vbnet: 'VB.NET',
    vbscript: 'VBScript',
    verilog: 'Verilog',
    xml: 'XML',
    yaml: 'YAML'
};

export function getDisplayNameForLanguage(language) {
    return languages[language.toLowerCase()] || '';
}
