// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import reactPlugin from "eslint-plugin-react";

export default {
  plugins: {
    react: reactPlugin
  },
  settings: {
    react: {
      pragma: "React",
      version: "detect"
    }
  },
  rules: {
    "react/display-name": [0, { ignoreTranspilerName: false }],
    "react/forbid-elements": [2, { forbid: ["embed"] }],
    "react/jsx-boolean-value": [2, "always"],
    "react/jsx-closing-bracket-location": [2, { location: "tag-aligned" }],
    "react/jsx-curly-spacing": [2, "never"],
    "react/jsx-equals-spacing": [2, "never"],
    "react/jsx-filename-extension": 2,
    "react/jsx-first-prop-new-line": [2, "multiline"],
    "react/jsx-indent": [2, 4],
    "react/jsx-indent-props": [2, 4],
    "react/jsx-key": 2,
    "react/jsx-max-props-per-line": [2, { maximum: 1 }],
    "react/jsx-no-comment-textnodes": 2,
    "react/jsx-no-duplicate-props": [2, { ignoreCase: false }],
    "react/jsx-no-literals": 2,
    "react/jsx-no-target-blank": 2,
    "react/jsx-no-undef": 2,
    "react/jsx-pascal-case": 2,
    "react/jsx-tag-spacing": [2, { closingSlash: "never", beforeSelfClosing: "never", afterOpening: "never" }],
    "react/jsx-uses-react": 2,
    "react/jsx-uses-vars": 2,
    "react/jsx-wrap-multilines": 2,
    "react/no-array-index-key": 1,
    "react/no-children-prop": 2,
    "react/no-danger": 0,
    "react/no-deprecated": 1,
    "react/no-did-mount-set-state": 2,
    "react/no-did-update-set-state": 2,
    "react/no-direct-mutation-state": 2,
    "react/no-find-dom-node": 1,
    "react/no-multi-comp": [2, { ignoreStateless: true }],
    "react/no-render-return-value": 2,
    "react/no-string-refs": 0,
    "react/no-unescaped-entities": 2,
    "react/no-unknown-property": 2,
    "react/no-unused-prop-types": [1, { skipShapeProps: true }],
    "react/prefer-es6-class": 2,
    "react/require-default-props": 0,
    "react/require-render-return": 2,
    "react/self-closing-comp": 2
  }
};
