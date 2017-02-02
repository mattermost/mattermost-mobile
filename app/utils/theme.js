// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function makeStyleSheetFromTheme(getStyleFromTheme) {
    let lastTheme = null;
    let style = null;

    return (theme) => {
        if (theme !== lastTheme) {
            style = getStyleFromTheme(theme);
            lastTheme = theme;
        }

        return style;
    };
}

export function changeOpacity(oldColor, opacity) {
    let color = oldColor;
    if (color[0] === '#') {
        color = color.slice(1);
    }

    if (color.length === 3) {
        const tempColor = color;
        color = '';

        color += tempColor[0] + tempColor[0];
        color += tempColor[1] + tempColor[1];
        color += tempColor[2] + tempColor[2];
    }

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
}
