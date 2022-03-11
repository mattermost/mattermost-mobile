// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform, StyleSheet} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {getViewPortWidth} from '../images';

export function getCodeFont() {
    return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
}

export const getMarkdownTextStyles = makeStyleSheetFromTheme((theme: Theme) => {
    const codeFont = getCodeFont();

    return {
        emph: {
            fontFamily: 'OpenSans-Italic',
        },
        strong: {
            fontFamily: 'OpenSans-SemiBold',
        },
        del: {
            textDecorationLine: 'line-through',
        },
        link: {
            color: theme.linkColor,
            fontFamily: 'OpenSans',
        },
        heading1: {
            fontFamily: 'OpenSans-Bold',
            fontSize: 24,
            lineHeight: 25,
        },
        heading1Text: {
            paddingBottom: 8,
        },
        heading2: {
            fontFamily: 'OpenSans-Bold',
            fontSize: 22,
            lineHeight: 25,
        },
        heading2Text: {
            paddingBottom: 8,
        },
        heading3: {
            fontFamily: 'OpenSans-Bold',
            fontSize: 21,
            lineHeight: 25,
        },
        heading3Text: {
            paddingBottom: 8,
        },
        heading4: {
            fontFamily: 'OpenSans-Bold',
            fontSize: 20,
            lineHeight: 25,
        },
        heading4Text: {
            paddingBottom: 8,
        },
        heading5: {
            fontFamily: 'OpenSans-Bold',
            fontSize: 19,
            lineHeight: 25,
        },
        heading5Text: {
            paddingBottom: 8,
        },
        heading6: {
            fontFamily: 'OpenSans-Bold',
            fontSize: 18,
            lineHeight: 25,
        },
        heading6Text: {
            paddingBottom: 8,
        },
        code: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            fontFamily: codeFont,
        },
        codeBlock: {
            fontFamily: codeFont,
        },
        mention: {
            fontFamily: 'OpenSans',
            color: theme.linkColor,
        },
        error: {
            fontFamily: 'OpenSans',
            color: theme.errorTextColor,
        },
        table_header_row: {
            fontFamily: 'OpenSans-Bold',
        },
        mention_highlight: {
            fontFamily: 'OpenSans',
            backgroundColor: theme.mentionHighlightBg,
            color: theme.mentionHighlightLink,
        },
    };
});

export const getMarkdownBlockStyles = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        adjacentParagraph: {
            marginTop: 6,
        },
        horizontalRule: {
            backgroundColor: theme.centerChannelColor,
            height: StyleSheet.hairlineWidth,
            marginVertical: 10,
        },
        quoteBlockIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

const languages: Record<string, string> = {
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
    elixir: 'Elixir',
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
    js: 'JavaScript',
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
    yaml: 'YAML',
};

export function getDisplayNameForLanguage(language: string) {
    return languages[language.toLowerCase()] || '';
}

export function escapeRegex(text: string) {
    return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function switchKeyboardForCodeBlocks(value: string, cursorPosition: number) {
    if (Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 12) {
        const regexForCodeBlock = /^```$(.*?)^```$|^```$(.*)/gms;

        const matches = [];
        let nextMatch;
        while ((nextMatch = regexForCodeBlock.exec(value)) !== null) {
            matches.push({
                startOfMatch: regexForCodeBlock.lastIndex - nextMatch[0].length,
                endOfMatch: regexForCodeBlock.lastIndex + 1,
            });
        }

        const cursorIsInsideCodeBlock = matches.some((match) => cursorPosition >= match.startOfMatch && cursorPosition <= match.endOfMatch);

        // 'email-address' keyboardType prevents iOS emdash autocorrect
        if (cursorIsInsideCodeBlock) {
            return 'email-address';
        }
    }

    return 'default';
}

export const getMarkdownImageSize = (
    isReplyPost: boolean,
    isTablet: boolean,
    sourceSize?: SourceSize,
    knownSize?: PostImage,
) => {
    let ratioW;
    let ratioH;

    if (sourceSize?.width && sourceSize?.height) {
        // if the source image is set with HxW
        return {width: sourceSize.width, height: sourceSize.height};
    } else if (knownSize?.width && knownSize.height) {
        // If the metadata size is set calculate the ratio
        ratioW = knownSize.width > 0 ? knownSize.height / knownSize.width : 1;
        ratioH = knownSize.height > 0 ? knownSize.width / knownSize.height : 1;
    }

    if (sourceSize?.width && !sourceSize.height && ratioW) {
        // If source Width is set calculate the height using the ratio
        return {width: sourceSize.width, height: sourceSize.width * ratioW};
    } else if (sourceSize?.height && !sourceSize.width && ratioH) {
        // If source Height is set calculate the width using the ratio
        return {width: sourceSize.height * ratioH, height: sourceSize.height};
    }

    if (sourceSize?.width || sourceSize?.height) {
        // if at least one size is set and we do not have metadata (svg's)
        const width = sourceSize.width;
        const height = sourceSize.height;
        return {width: width || height, height: height || width};
    }

    if (knownSize?.width && knownSize.height) {
        // When metadata values are set
        return {width: knownSize.width, height: knownSize.height};
    }

    // When no metadata and source size is not specified (full size svg's)
    const width = getViewPortWidth(isReplyPost, isTablet);
    return {width, height: width};
};
