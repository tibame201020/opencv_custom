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

            // 1. self. and self.platform completions
            if (prefix.trim().endsWith('self.')) {
                return {
                    suggestions: PLATFORM_METHODS.map(m => ({
                        ...m,
                        range: range
                    }))
                };
            }

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

            // 3. Global completions
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
                    insertText: ['if ${1:condition}:', '\t${2:pass}'].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'If statement',
                    range: range
                },
                {
                    label: 'def',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: ['def ${1:function_name}(${2:args}):', '\t"""${3:docstring}"""', '\t${4:pass}'].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Function definition',
                    range: range
                }
            ];

            const customSuggestions = [
                {
                    label: 'self.tap',
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: 'self.tap("${1:image.png}")',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Search and click image',
                    range: range
                },
                {
                    label: 'self.find',
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: 'self.find("${1:image.png}")',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Find image',
                    range: range
                },
                {
                    label: 'OcrRegion',
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: 'OcrRegion(${1:x}, ${2:y}, ${3:w}, ${4:h})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define OCR region',
                    range: range
                }
            ];

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
                                range: range
                            });
                        }
                    });
                });
            } catch (err) { }

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
            const isSelfMethod = prefix.endsWith('self.');

            if ((isPlatformMethod || isSelfMethod) && PLATFORM_DOCS[word.word]) {
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
    { label: 'click', kind: 2, insertText: 'click(${1:x}, ${2:y})', insertTextRules: 4, detail: '(x, y)', documentation: '點擊座標 (x, y)' },
    { label: 'tap', kind: 2, insertText: 'tap("${1:img}.png")', insertTextRules: 4, detail: '(img_name)', documentation: '搜尋圖片並點擊' },
    { label: 'find', kind: 2, insertText: 'find("${1:img}.png")', insertTextRules: 4, detail: '(img_name)', documentation: '在預設目錄搜尋圖片' },
    { label: 'wait_tap', kind: 2, insertText: 'wait_tap("${1:img}.png", timeout=${2:10})', insertTextRules: 4, detail: '(img_name, timeout)', documentation: '等待圖片出現並點擊' },
    { label: 'swipe', kind: 2, insertText: 'swipe(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2})', insertTextRules: 4, detail: '(x1, y1, x2, y2)', documentation: '滑動 A 到 B' },
    { label: 'ocr_text', kind: 2, insertText: 'ocr_text("${1:img}.png", OcrRegion(${2:x}, ${3:y}, ${4:w}, ${5:h}))', insertTextRules: 4, detail: '(path, region)', documentation: '進行文字辨識' },
    { label: 'ocr_pattern', kind: 2, insertText: 'ocr_pattern("${1:img}.png", OcrRegion(${2:x}, ${3:y}, ${4:w}, ${5:h}))', insertTextRules: 4, detail: '(path, region)', documentation: '進行圖案辨識' },
    { label: 'sleep', kind: 2, insertText: 'sleep(${1:1})', insertTextRules: 4, detail: '(sec)', documentation: '程式暫停 (秒)' },
    { label: 'log', kind: 2, insertText: 'log("${1:message}")', insertTextRules: 4, detail: '(msg)', documentation: '輸出記錄' }
];

const PLATFORM_DOCS: Record<string, { signature: string, description: string }> = {
    click: { signature: 'click(x, y)', description: '點擊指定座標' },
    tap: { signature: 'tap(image_name, threshold=None, region=None)', description: '搜尋圖片並點擊 (路徑相對於 images/)' },
    find: { signature: 'find(image_name, threshold=None, region=None)', description: '在預設目錄搜尋圖片' },
    wait_tap: { signature: 'wait_tap(image_name, timeout=10)', description: '等待圖片出現並點擊' },
    swipe: { signature: 'swipe(x1, y1, x2, y2, duration=500)', description: '滑動 A 到 B' },
    ocr_text: { signature: 'ocr_text(path, region, threshold=0.8)', description: '文字辨識 (OCR)' },
    ocr_pattern: { signature: 'ocr_pattern(path, region, threshold=0.8)', description: '圖像模式辨識' },
    sleep: { signature: 'sleep(seconds)', description: '暫停腳本執行' },
    log: { signature: 'log(message, type="info")', description: '向控制台發送記錄' }
};
