let isRegistered = false;

export const registerPythonCompletions = (monaco: any) => {
    if (isRegistered) return;
    isRegistered = true;

    monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.', '(', ','],
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const lineContent = model.getLineContent(position.lineNumber);
            const prefix = lineContent.substring(0, position.column - 1);

            // 1. self.platform completions
            if (prefix.trim().endsWith('self.platform.')) {
                return {
                    suggestions: PLATFORM_METHODS.map(m => ({
                        ...m,
                        range: range
                    }))
                };
            }

            // 2. AdbKeyCode completions
            if (prefix.trim().endsWith('AdbKeyCode.')) {
                return {
                    suggestions: KEY_CODES.map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.EnumMember,
                        insertText: k,
                        range: range
                    }))
                };
            }

            // 3. Global completions (Context aware + Python Standards)
            const pythonKeywords = [
                'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
                'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
                'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
                'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
            ];

            const pythonBuiltins = [
                'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
                'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir',
                'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format',
                'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
                'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list',
                'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct',
                'open', 'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed',
                'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str',
                'sum', 'super', 'tuple', 'type', 'vars', 'zip'
            ];

            const keywordSuggestions = pythonKeywords.map(key => ({
                label: key,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: key,
                range: range
            }));

            const builtinSuggestions = pythonBuiltins.map(func => ({
                label: func,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: func,
                documentation: `Built-in function ${func}`,
                range: range
            }));

            const snippetSuggestions = [
                {
                    label: 'if',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'if ${1:condition}:',
                        '\t${2:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'If statement',
                    range: range
                },
                {
                    label: 'ifelse',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'if ${1:condition}:',
                        '\t${2:pass}',
                        'else:',
                        '\t${3:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'If-Else statement',
                    range: range
                },
                {
                    label: 'def',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'def ${1:function_name}(${2:args}):',
                        '\t"""${3:docstring}"""',
                        '\t${4:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Function definition',
                    range: range
                },
                {
                    label: 'for',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'for ${1:item} in ${2:iterable}:',
                        '\t${3:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'For loop',
                    range: range
                },
                {
                    label: 'try',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'try:',
                        '\t${1:pass}',
                        'except ${2:Exception} as ${3:e}:',
                        '\t${4:print(e)}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Try-Except block',
                    range: range
                },
                {
                    label: 'class',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'class ${1:ClassName}:',
                        '\tdef __init__(self, ${2:args}):',
                        '\t\t${3:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Class definition',
                    range: range
                },
                {
                    label: 'main',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'if __name__ == "__main__":',
                        '\t${1:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Main block',
                    range: range
                }
            ];

            const customSuggestions = [
                {
                    label: 'self.platform',
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: 'self.platform',
                    documentation: 'Access platform specific commands',
                    range: range
                },
                {
                    label: 'self.deviceId',
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: 'self.deviceId',
                    documentation: 'Current device ID',
                    range: range
                },
                {
                    label: 'self.image_root',
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: 'self.image_root',
                    documentation: 'Root path for script images',
                    range: range
                },
                {
                    label: 'AdbKeyCode',
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: 'AdbKeyCode.',
                    documentation: 'ADB KeyCode Enum',
                    range: range
                },
                {
                    label: 'OcrRegion',
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: 'OcrRegion(${1:x}, ${2:y}, ${3:w}, ${4:h})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'OcrRegion(x, y, w, h)',
                    documentation: 'Define a region for OCR/Image search',
                    range: range
                },
                {
                    label: 'loop',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'while True:',
                        '\t${1:pass}'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Infinite loop',
                    range: range
                },
                {
                    label: 'find_and_click',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: [
                        'found_point = self.platform.wait_image(f"{self.image_root}/${1:target.png}", 5000, 500, self.deviceId)',
                        'if found_point:',
                        '\tself.platform.click(found_point[0], found_point[1], self.deviceId)'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Advanced pattern to wait for an image and click it',
                    range: range
                },
                {
                    label: 'sleep',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'time.sleep(${1:1})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Sleep for seconds',
                    range: range
                }
            ];

            // 4. Cross-module symbols (from all open models)
            const dynamicSuggestions: any[] = [];
            try {
                const allModels = monaco.editor.getModels();
                allModels.forEach((m: any) => {
                    const text = m.getValue();
                    const lines = text.split('\n');
                    lines.forEach((line: string) => {
                        const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                        if (classMatch) {
                            dynamicSuggestions.push({
                                label: classMatch[1],
                                kind: monaco.languages.CompletionItemKind.Class,
                                insertText: classMatch[1],
                                detail: `Class from ${m.uri ? m.uri.path.split('/').pop() : 'unknown'}`,
                                range: range
                            });
                        }
                        const defMatch = line.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
                        if (defMatch) {
                            dynamicSuggestions.push({
                                label: defMatch[1],
                                kind: monaco.languages.CompletionItemKind.Function,
                                insertText: defMatch[1],
                                detail: `Function from ${m.uri ? m.uri.path.split('/').pop() : 'unknown'}`,
                                range: range
                            });
                        }
                    });
                });
            } catch (err) { console.error("Symbol scan failed", err); }

            return {
                suggestions: [
                    ...keywordSuggestions,
                    ...builtinSuggestions,
                    ...snippetSuggestions,
                    ...customSuggestions,
                    ...dynamicSuggestions
                ]
            };
        }
    });


    // 3. Hover Provider
    monaco.languages.registerHoverProvider('python', {
        provideHover: (model: any, position: any) => {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            const lineContent = model.getLineContent(position.lineNumber);
            const prefix = lineContent.substring(0, word.startColumn - 1).trim();
            const isPlatformMethod = prefix.endsWith('self.platform.');

            if (isPlatformMethod && PLATFORM_DOCS[word.word]) {
                const doc = PLATFORM_DOCS[word.word];
                return {
                    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                    contents: [
                        { value: `**${word.word}**` },
                        { value: `\`${doc.signature}\`` },
                        { value: doc.description }
                    ]
                };
            }
            return null;
        }
    });
};

const KEY_CODES = [
    'KEYCODE_UNKNOWN', 'KEYCODE_SOFT_LEFT', 'KEYCODE_SOFT_RIGHT', 'KEYCODE_HOME', 'KEYCODE_BACK',
    'KEYCODE_CALL', 'KEYCODE_ENDCALL', 'KEYCODE_0', 'KEYCODE_1', 'KEYCODE_2', 'KEYCODE_3',
    'KEYCODE_4', 'KEYCODE_5', 'KEYCODE_6', 'KEYCODE_7', 'KEYCODE_8', 'KEYCODE_9', 'KEYCODE_STAR',
    'KEYCODE_POUND', 'KEYCODE_DPAD_UP', 'KEYCODE_DPAD_DOWN', 'KEYCODE_DPAD_LEFT', 'KEYCODE_DPAD_RIGHT',
    'KEYCODE_DPAD_CENTER', 'KEYCODE_VOLUME_UP', 'KEYCODE_VOLUME_DOWN', 'KEYCODE_POWER', 'KEYCODE_CAMERA',
    'KEYCODE_CLEAR', 'KEYCODE_A', 'KEYCODE_B', 'KEYCODE_C', 'KEYCODE_D', 'KEYCODE_E', 'KEYCODE_F',
    'KEYCODE_G', 'KEYCODE_H', 'KEYCODE_I', 'KEYCODE_J', 'KEYCODE_K', 'KEYCODE_L', 'KEYCODE_M',
    'KEYCODE_N', 'KEYCODE_O', 'KEYCODE_P', 'KEYCODE_Q', 'KEYCODE_R', 'KEYCODE_S', 'KEYCODE_T',
    'KEYCODE_U', 'KEYCODE_V', 'KEYCODE_W', 'KEYCODE_X', 'KEYCODE_Y', 'KEYCODE_Z', 'KEYCODE_COMMA',
    'KEYCODE_PERIOD', 'KEYCODE_ALT_LEFT', 'KEYCODE_ALT_RIGHT', 'KEYCODE_SHIFT_LEFT', 'KEYCODE_SHIFT_RIGHT',
    'KEYCODE_TAB', 'KEYCODE_SPACE', 'KEYCODE_SYM', 'KEYCODE_EXPLORER', 'KEYCODE_ENVELOPE', 'KEYCODE_ENTER',
    'KEYCODE_DEL', 'KEYCODE_GRAVE', 'KEYCODE_MINUS', 'KEYCODE_EQUALS', 'KEYCODE_LEFT_BRACKET',
    'KEYCODE_RIGHT_BRACKET', 'KEYCODE_BACKSLASH', 'KEYCODE_SEMICOLON', 'KEYCODE_APOSTROPHE',
    'KEYCODE_SLASH', 'KEYCODE_AT', 'KEYCODE_NUM', 'KEYCODE_HEADSETHOOK', 'KEYCODE_FOCUS',
    'KEYCODE_PLUS', 'KEYCODE_MENU', 'KEYCODE_NOTIFICATION', 'KEYCODE_SEARCH', 'KEYCODE_MEDIA_PLAY_PAUSE',
    'KEYCODE_MEDIA_STOP', 'KEYCODE_MEDIA_NEXT', 'KEYCODE_MEDIA_PREVIOUS', 'KEYCODE_MEDIA_REWIND',
    'KEYCODE_MEDIA_FAST_FORWARD', 'KEYCODE_MUTE'
];

const PLATFORM_METHODS = [
    { label: 'click', kind: 2, insertText: 'click(${1:x}, ${2:y}, self.deviceId)', insertTextRules: 4, detail: '(x, y, dev_id)', documentation: 'Sends a click event.' },
    { label: 'click_image', kind: 2, insertText: 'click_image(f"{self.image_root}/${1:img}.png", OcrRegion(${2:0}, ${3:0}, ${4:100}, ${5:100}), self.deviceId)', insertTextRules: 4, detail: '(path, region, dev_id)', documentation: 'Clicks target image center.' },
    { label: 'click_image_full', kind: 2, insertText: 'click_image_full(f"{self.image_root}/${1:img}.png", self.deviceId)', insertTextRules: 4, detail: '(path, dev_id)', documentation: 'Clicks image anywhere on screen.' },
    { label: 'click_image_with_similar', kind: 2, insertText: 'click_image_with_similar(f"{self.image_root}/${1:img}.png", ${2:0.9}, self.deviceId)', insertTextRules: 4, detail: '(path, sim, dev_id)', documentation: 'Clicks image with similarity threshold.' },
    { label: 'find_image_full', kind: 2, insertText: 'find_image_full(f"{self.image_root}/${1:img}.png", self.deviceId)', insertTextRules: 4, detail: '(path, dev_id)', documentation: 'Returns (found, point) for image.' },
    { label: 'find_image_with_similar', kind: 2, insertText: 'find_image_with_similar(f"{self.image_root}/${1:img}.png", ${2:0.9}, self.deviceId)', insertTextRules: 4, detail: '(path, sim, dev_id)', documentation: 'Returns (found, point) with similarity.' },
    { label: 'wait_image', kind: 2, insertText: 'wait_image(f"{self.image_root}/${1:img}.png", ${2:5000}, ${3:500}, self.deviceId)', insertTextRules: 4, detail: '(path, ms, freq, dev_id)', documentation: 'Waits for image to appear. Returns point.' },
    { label: 'wait_click_image', kind: 2, insertText: 'wait_click_image(f"{self.image_root}/${1:img}.png", ${2:5000}, ${3:500}, self.deviceId)', insertTextRules: 4, detail: '(path, ms, freq, dev_id)', documentation: 'Waits and clicks image.' },
    { label: 'swipe', kind: 2, insertText: 'swipe(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, self.deviceId)', insertTextRules: 4, detail: '(x1, y1, x2, y2, dev_id)', documentation: 'Sends a swipe event.' },
    { label: 'swipe_with_duration', kind: 2, insertText: 'swipe_with_duration(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, ${5:1000}, self.deviceId)', insertTextRules: 4, detail: '(x1, y1, x2, y2, dur, dev_id)', documentation: 'Swipe with specific duration.' },
    { label: 'drag', kind: 2, insertText: 'drag(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, self.deviceId)', insertTextRules: 4, detail: '(x1, y1, x2, y2, dev_id)', documentation: 'Sends a drag event (1000ms).' },
    { label: 'drag_with_duration', kind: 2, insertText: 'drag_with_duration(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2}, ${5:1000}, self.deviceId)', insertTextRules: 4, detail: '(x1, y1, x2, y2, dur, dev_id)', documentation: 'Drag with specific duration.' },
    { label: 'drag_image_to_image', kind: 2, insertText: 'drag_image_to_image(f"{self.image_root}/${1:src}.png", f"{self.image_root}/${2:dst}.png", self.deviceId)', insertTextRules: 4, detail: '(src, dst, dev_id)', documentation: 'Drags target 1 to target 2.' },
    { label: 'type_text', kind: 2, insertText: 'type_text("${1:content}", self.deviceId)', insertTextRules: 4, detail: '(text, dev_id)', documentation: 'Types input text.' },
    { label: 'key_event', kind: 2, insertText: 'key_event(${1:AdbKeyCode.KEYCODE_HOME}, self.deviceId)', insertTextRules: 4, detail: '(keycode, dev_id)', documentation: 'Sends hardware key event.' },
    { label: 'start_app', kind: 2, insertText: 'start_app("${1:package}", self.deviceId)', insertTextRules: 4, detail: '(pkg, dev_id)', documentation: 'Starts application.' },
    { label: 'stop_app', kind: 2, insertText: 'stop_app("${1:package}", self.deviceId)', insertTextRules: 4, detail: '(pkg, dev_id)', documentation: 'Stops application.' },
    { label: 'cleanup_app_data', kind: 2, insertText: 'cleanup_app_data("${1:package}", self.deviceId)', insertTextRules: 4, detail: '(pkg, dev_id)', documentation: 'Clears app data.' },
    { label: 'get_app_list', kind: 2, insertText: 'get_app_list(self.deviceId)', insertTextRules: 4, detail: '(dev_id)', documentation: 'Lists all installed apps.' },
    { label: 'take_snapshot', kind: 2, insertText: 'take_snapshot(self.deviceId)', insertTextRules: 4, detail: '(dev_id)', documentation: 'Returns screen as Mat.' },
    { label: 'take_snapshot_to_file', kind: 2, insertText: 'take_snapshot_to_file("${1:filename}.png", self.deviceId)', insertTextRules: 4, detail: '(path, dev_id)', documentation: 'Saves shot to file.' },
    { label: 'pull', kind: 2, insertText: 'pull("${1:remote}", "${2:local}", self.deviceId)', insertTextRules: 4, detail: '(rem, loc, dev_id)', documentation: 'Pulls data from device.' },
    { label: 'push', kind: 2, insertText: 'push("${1:local}", "${2:remote}", self.deviceId)', insertTextRules: 4, detail: '(loc, rem, dev_id)', documentation: 'Pushes data to device.' },
    { label: 'get_devices', kind: 2, insertText: 'get_devices()', insertTextRules: 4, detail: '()', documentation: 'Lists available ADB devices.' },
    { label: 'restart', kind: 2, insertText: 'restart()', insertTextRules: 4, detail: '()', documentation: 'Restarts ADB server.' },
    { label: 'sleep', kind: 2, insertText: 'sleep(${1:5})', insertTextRules: 4, detail: '(sec)', documentation: 'Pauses execution.' },
    { label: 'exec', kind: 2, insertText: 'exec("${1:shell command}")', insertTextRules: 4, detail: '(cmd)', documentation: 'Executes raw shell command.' },
    { label: 'get_open_cv_service', kind: 2, insertText: 'get_open_cv_service()', insertTextRules: 4, detail: '()', documentation: 'Access advanced CV methods.' }
];

const PLATFORM_DOCS: Record<string, { signature: string, description: string }> = {
    click: { signature: 'click(x, y, dev_id=None)', description: 'Sends a tap at (x, y).' },
    click_image: { signature: 'click_image(path, region, dev_id=None)', description: 'Clicks center of image found in rect region.' },
    click_image_full: { signature: 'click_image_full(path, dev_id=None)', description: 'Clicks center of image found anywhere on screen.' },
    click_image_with_similar: { signature: 'click_image_with_similar(path, similar, dev_id=None)', description: 'Clicks image using specific threshold (0.0-1.0).' },
    find_image_full: { signature: 'find_image_full(path, dev_id=None)', description: 'Returns (found, point) if image is on screen.' },
    find_image_with_similar: { signature: 'find_image_with_similar(path, similar, dev_id=None)', description: 'Returns (found, point) with sim threshold.' },
    wait_image: { signature: 'wait_image(path, ms, freq, dev_id=None)', description: 'Blocks and waits for image. Returns point or raises error.' },
    wait_click_image: { signature: 'wait_click_image(path, ms, freq, dev_id=None)', description: 'Blocks, waits, and clicks image center.' },
    swipe: { signature: 'swipe(x1, y1, x2, y2, dev_id=None)', description: 'Moves finger from A to B.' },
    swipe_with_duration: { signature: 'swipe_with_duration(...)', description: 'Swipe with speed control (ms).' },
    drag_image_to_image: { signature: 'drag_image_to_image(s, d, dev_id=None)', description: 'Drags from center of S to center of D.' },
    type_text: { signature: 'type_text(text, dev_id=None)', description: 'Simulates keyboard entry.' },
    key_event: { signature: 'key_event(AdbKeyCode, dev_id=None)', description: 'Triggers hardware buttons like HOME or BACK.' },
    start_app: { signature: 'start_app(package, dev_id=None)', description: 'Opens application.' },
    stop_app: { signature: 'stop_app(package, dev_id=None)', description: 'Force closes application.' },
    cleanup_app_data: { signature: 'cleanup_app_data(package, dev_id=None)', description: 'Wipes PM package state.' },
    take_snapshot: { signature: 'take_snapshot(dev_id=None)', description: 'Captures screen as numpy/cv2 Mat.' },
    get_open_cv_service: { signature: 'get_open_cv_service()', description: 'Returns OpenCvService for OCR and custom matching.' }
};
