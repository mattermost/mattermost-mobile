// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/xml_escape.test.js`.
// Exercises xml_escape() from maestro/scripts/run_ci_batches.sh (Bash 3.2 + 5.x safe).

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {describe, it} = require('node:test');

const SCRIPT_PATH = path.join(__dirname, '../maestro/scripts/run_ci_batches.sh');

function extractXmlEscapeFn() {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const match = script.match(/xml_escape\(\) \{[\s\S]*?\n\s*\}/);
    assert.ok(match, 'xml_escape() function must exist in run_ci_batches.sh');
    return match[0];
}

function xmlEscape(input) {
    const fn = extractXmlEscapeFn();
    return execFileSync(
        'bash',
        ['-c', `${fn}\nprintf '%s' "$(xml_escape "$1")"`, 'xml_escape', input],
        {encoding: 'utf8'},
    );
}

describe('run_ci_batches.sh xml_escape', () => {
    it('should escape < > & " in an order that keeps amp first', () => {
        assert.equal(xmlEscape('<flow>&"'), '&lt;flow&gt;&amp;&quot;');
        assert.equal(xmlEscape('a&b'), 'a&amp;b');
        assert.equal(xmlEscape('x<y>z'), 'x&lt;y&gt;z');
        assert.equal(xmlEscape('say "hi"'), 'say &quot;hi&quot;');
    });

    it('should produce attribute-safe values for synthetic JUnit XML', () => {
        const label = 'flows/channels/<bookmark>&"link".yml';
        const escaped = xmlEscape(label);
        const xml = `<?xml version='1.0' encoding='UTF-8'?>
<testsuites>
  <testsuite name="${escaped}" tests="1" failures="1" errors="0" skipped="0" time="0">
    <testcase id="id" name="id" classname="${escaped}" file="${escaped}" time="0" status="ERROR">
      <failure>batch failed (${escaped})</failure>
    </testcase>
  </testsuite>
</testsuites>
`;
        assert.equal(escaped, 'flows/channels/&lt;bookmark&gt;&amp;&quot;link&quot;.yml');
        assert.doesNotMatch(escaped, /[<>"]/);
        assert.match(xml, /name="flows\/channels\/&lt;bookmark&gt;&amp;&quot;link&quot;\.yml"/);
        assert.ok(!xml.includes('name="<'), 'unescaped < must not appear in attributes');
    });
});
