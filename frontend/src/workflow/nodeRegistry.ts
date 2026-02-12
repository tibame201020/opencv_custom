/**
 * Node Registry — 定義所有 Workflow Node 類型的 metadata
 *
 * 每個 NodeDefinition 直接映射到 PlatformService / ScriptInterface 的真實能力
 */

import {
    MousePointerClick, Move, Type, Keyboard, Camera, Clock,
    Search, ImagePlus, Timer, Eye, ScanText, Grid3X3,
    GitBranch, Repeat, Layers, FileText
} from 'lucide-react';
import type { FC } from 'react';

/* ============================================================
 *  Parameter Schema Types
 * ============================================================ */

export type ParamType =
    | 'int'       // 整數
    | 'float'     // 浮點數
    | 'string'    // 字串
    | 'boolean'   // 布林
    | 'asset'     // 從 Asset Explorer 選取圖片
    | 'region'    // OcrRegion { x1, y1, x2, y2 }
    | 'expression' // 表達式（用於 If Condition）
    | 'select';    // 下拉選單

export interface ParamSchema {
    key: string;
    label: string;
    type: ParamType;
    required?: boolean;
    defaultValue?: any;
    placeholder?: string;
    description?: string;
    options?: { value: string; label: string }[];  // for 'select' type
    min?: number;
    max?: number;
}

export interface OutputSchema {
    key: string;
    label: string;
    type: 'bool' | 'string' | 'number' | 'position' | 'image' | 'any';
}

/* ============================================================
 *  Node Definition
 * ============================================================ */

export type NodeCategory = 'platform' | 'vision' | 'flow';

export interface NodeDefinition {
    type: string;              // unique ID, e.g. 'click', 'find_image'
    label: string;             // 顯示名稱
    description: string;       // 簡短描述
    category: NodeCategory;
    color: string;             // tailwind color class, e.g. 'primary', 'secondary'
    icon: FC<any>;             // lucide icon component
    params: ParamSchema[];     // 輸入參數
    outputs: OutputSchema[];   // 輸出 schema
    pythonMethod?: string;     // 對映的 Python 方法名稱
    handleConfig?: {
        sources: { id: string; label: string; position?: string }[];  // 多輸出 handle
    };
}

/* ============================================================
 *  Category Labels
 * ============================================================ */

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
    platform: 'Platform',
    vision: 'Vision / OpenCV',
    flow: 'Flow Control',
};

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
    platform: 'text-primary',
    vision: 'text-secondary',
    flow: 'text-accent',
};

/* ============================================================
 *  Registry
 * ============================================================ */

export const NODE_DEFINITIONS: NodeDefinition[] = [
    /* ── Platform ─────────────────────────────────────────── */
    {
        type: 'click',
        label: 'Click',
        description: '模擬點擊座標',
        category: 'platform',
        color: 'primary',
        icon: MousePointerClick,
        pythonMethod: 'platform.click',
        params: [
            { key: 'x', label: 'X', type: 'int', required: true, placeholder: '0', description: '點擊 X 座標' },
            { key: 'y', label: 'Y', type: 'int', required: true, placeholder: '0', description: '點擊 Y 座標' },
        ],
        outputs: [
            { key: 'success', label: 'Success', type: 'bool' },
        ],
    },
    {
        type: 'swipe',
        label: 'Swipe',
        description: '模擬滑動手勢',
        category: 'platform',
        color: 'primary',
        icon: Move,
        pythonMethod: 'platform.swipe',
        params: [
            { key: 'x1', label: 'Start X', type: 'int', required: true },
            { key: 'y1', label: 'Start Y', type: 'int', required: true },
            { key: 'x2', label: 'End X', type: 'int', required: true },
            { key: 'y2', label: 'End Y', type: 'int', required: true },
            { key: 'duration', label: 'Duration (ms)', type: 'int', defaultValue: 500, min: 100, max: 5000 },
        ],
        outputs: [
            { key: 'success', label: 'Success', type: 'bool' },
        ],
    },
    {
        type: 'type_text',
        label: 'Type Text',
        description: '模擬文字輸入',
        category: 'platform',
        color: 'primary',
        icon: Type,
        pythonMethod: 'platform.type_text',
        params: [
            { key: 'text', label: 'Text', type: 'string', required: true, placeholder: 'Hello World' },
        ],
        outputs: [
            { key: 'success', label: 'Success', type: 'bool' },
        ],
    },
    {
        type: 'key_event',
        label: 'Key Event',
        description: '模擬按鍵（Back, Home 等）',
        category: 'platform',
        color: 'primary',
        icon: Keyboard,
        pythonMethod: 'platform.key_event',
        params: [
            {
                key: 'key_code', label: 'Key', type: 'select', required: true,
                options: [
                    { value: 'BACK', label: 'Back' },
                    { value: 'HOME', label: 'Home' },
                    { value: 'MENU', label: 'Menu' },
                    { value: 'ENTER', label: 'Enter' },
                    { value: 'TAB', label: 'Tab' },
                    { value: 'VOLUME_UP', label: 'Volume Up' },
                    { value: 'VOLUME_DOWN', label: 'Volume Down' },
                ],
            },
        ],
        outputs: [
            { key: 'success', label: 'Success', type: 'bool' },
        ],
    },
    {
        type: 'screenshot',
        label: 'Screenshot',
        description: '擷取當前螢幕畫面',
        category: 'platform',
        color: 'primary',
        icon: Camera,
        pythonMethod: 'platform.snapshot',
        params: [],
        outputs: [
            { key: 'image', label: 'Image', type: 'image' },
        ],
    },
    {
        type: 'sleep',
        label: 'Sleep',
        description: '等待指定秒數',
        category: 'platform',
        color: 'primary',
        icon: Clock,
        pythonMethod: 'platform.sleep',
        params: [
            { key: 'seconds', label: 'Seconds', type: 'float', required: true, defaultValue: 1.0, min: 0.1, max: 300 },
        ],
        outputs: [],
    },

    /* ── Vision / OpenCV ──────────────────────────────────── */
    {
        type: 'find_image',
        label: 'Find Image',
        description: '在螢幕中尋找指定圖片',
        category: 'vision',
        color: 'secondary',
        icon: Search,
        pythonMethod: 'platform.find_image',
        params: [
            { key: 'image', label: 'Image', type: 'asset', required: true, description: '要搜尋的圖片' },
            { key: 'threshold', label: 'Threshold', type: 'float', defaultValue: 0.9, min: 0, max: 1, description: '相似度閾值' },
            { key: 'region', label: 'Region', type: 'region', description: '搜尋區域（留空=全螢幕）' },
        ],
        outputs: [
            { key: 'found', label: 'Found', type: 'bool' },
            { key: 'x', label: 'X', type: 'number' },
            { key: 'y', label: 'Y', type: 'number' },
        ],
    },
    {
        type: 'click_image',
        label: 'Click Image',
        description: '尋找圖片並點擊',
        category: 'vision',
        color: 'secondary',
        icon: ImagePlus,
        pythonMethod: 'platform.click_image',
        params: [
            { key: 'image', label: 'Image', type: 'asset', required: true },
            { key: 'threshold', label: 'Threshold', type: 'float', defaultValue: 0.9, min: 0, max: 1 },
            { key: 'region', label: 'Region', type: 'region' },
        ],
        outputs: [
            { key: 'success', label: 'Clicked', type: 'bool' },
        ],
    },
    {
        type: 'wait_image',
        label: 'Wait Image',
        description: '等待圖片出現',
        category: 'vision',
        color: 'secondary',
        icon: Timer,
        pythonMethod: 'platform.wait_image',
        params: [
            { key: 'image', label: 'Image', type: 'asset', required: true },
            { key: 'timeout', label: 'Timeout (s)', type: 'int', defaultValue: 10, min: 1, max: 120 },
            { key: 'frequency', label: 'Check Interval (s)', type: 'float', defaultValue: 0.5, min: 0.1, max: 5 },
            { key: 'threshold', label: 'Threshold', type: 'float', defaultValue: 0.9, min: 0, max: 1 },
            { key: 'region', label: 'Region', type: 'region' },
        ],
        outputs: [
            { key: 'found', label: 'Found', type: 'bool' },
            { key: 'x', label: 'X', type: 'number' },
            { key: 'y', label: 'Y', type: 'number' },
        ],
    },
    {
        type: 'wait_click_image',
        label: 'Wait & Click',
        description: '等待圖片出現並點擊',
        category: 'vision',
        color: 'secondary',
        icon: Eye,
        pythonMethod: 'platform.wait_click_image',
        params: [
            { key: 'image', label: 'Image', type: 'asset', required: true },
            { key: 'timeout', label: 'Timeout (s)', type: 'int', defaultValue: 10 },
            { key: 'frequency', label: 'Check Interval (s)', type: 'float', defaultValue: 0.5 },
            { key: 'threshold', label: 'Threshold', type: 'float', defaultValue: 0.9 },
            { key: 'region', label: 'Region', type: 'region' },
        ],
        outputs: [
            { key: 'success', label: 'Clicked', type: 'bool' },
        ],
    },
    {
        type: 'ocr_text',
        label: 'OCR Text',
        description: '在指定區域辨識文字',
        category: 'vision',
        color: 'secondary',
        icon: ScanText,
        pythonMethod: 'platform.ocr_text',
        params: [
            { key: 'templates_path', label: 'Templates Path', type: 'asset', required: true, description: 'OCR 模板資料夾' },
            { key: 'region', label: 'Region', type: 'region', required: true },
            { key: 'threshold', label: 'Threshold', type: 'float', defaultValue: 0.8 },
        ],
        outputs: [
            { key: 'text', label: 'Result Text', type: 'string' },
        ],
    },
    {
        type: 'ocr_pattern',
        label: 'OCR Pattern',
        description: '在指定區域辨識圖案/符號',
        category: 'vision',
        color: 'secondary',
        icon: Grid3X3,
        pythonMethod: 'platform.ocr_pattern',
        params: [
            { key: 'templates_path', label: 'Templates Path', type: 'asset', required: true },
            { key: 'region', label: 'Region', type: 'region', required: true },
            { key: 'threshold', label: 'Threshold', type: 'float', defaultValue: 0.8 },
        ],
        outputs: [
            { key: 'pattern', label: 'Result Pattern', type: 'string' },
        ],
    },

    /* ── Flow Control ─────────────────────────────────────── */
    {
        type: 'if_condition',
        label: 'If Condition',
        description: '根據條件分支',
        category: 'flow',
        color: 'accent',
        icon: GitBranch,
        params: [
            { key: 'expression', label: 'Condition', type: 'expression', required: true, placeholder: '{{ $nodes["Find Image"].output.found }}', description: '條件表達式' },
        ],
        outputs: [
            { key: 'result', label: 'Result', type: 'bool' },
        ],
        handleConfig: {
            sources: [
                { id: 'true', label: 'True', position: '30%' },
                { id: 'false', label: 'False', position: '70%' },
            ],
        },
    },
    {
        type: 'loop',
        label: 'Loop',
        description: '重複執行（固定次數或條件式）',
        category: 'flow',
        color: 'accent',
        icon: Repeat,
        params: [
            {
                key: 'mode', label: 'Mode', type: 'select', required: true, defaultValue: 'count',
                options: [
                    { value: 'count', label: 'Fixed Count' },
                    { value: 'while', label: 'While Condition' },
                ],
            },
            { key: 'count', label: 'Count', type: 'int', defaultValue: 3, min: 1, max: 9999, description: 'mode=count 時的迴圈次數' },
            { key: 'condition', label: 'Condition', type: 'expression', placeholder: '{{ ... }}', description: 'mode=while 時的繼續條件' },
        ],
        outputs: [
            { key: 'index', label: 'Current Index', type: 'number' },
            { key: 'completed', label: 'Completed', type: 'bool' },
        ],
        handleConfig: {
            sources: [
                { id: 'body', label: 'Loop Body', position: '30%' },
                { id: 'done', label: 'Done', position: '70%' },
            ],
        },
    },
    {
        type: 'sub_workflow',
        label: 'Sub-Workflow',
        description: '嵌入另一個 Workflow',
        category: 'flow',
        color: 'accent',
        icon: Layers,
        params: [
            { key: 'workflow_id', label: 'Workflow', type: 'select', required: true, description: '選擇要嵌入的 Workflow' },
        ],
        outputs: [
            { key: 'result', label: 'Result', type: 'any' },
        ],
    },
    {
        type: 'log',
        label: 'Log',
        description: '輸出日誌訊息',
        category: 'flow',
        color: 'accent',
        icon: FileText,
        pythonMethod: 'log',
        params: [
            { key: 'message', label: 'Message', type: 'string', required: true, placeholder: 'Step completed' },
            {
                key: 'type', label: 'Level', type: 'select', defaultValue: 'info',
                options: [
                    { value: 'info', label: 'Info' },
                    { value: 'warn', label: 'Warning' },
                    { value: 'error', label: 'Error' },
                ],
            },
        ],
        outputs: [],
    },
];

/* ============================================================
 *  Helpers
 * ============================================================ */

/** Get a NodeDefinition by its type string */
export function getNodeDef(type: string): NodeDefinition | undefined {
    return NODE_DEFINITIONS.find(n => n.type === type);
}

/** Get all nodes grouped by category */
export function getNodesByCategory(): Record<NodeCategory, NodeDefinition[]> {
    const grouped: Record<NodeCategory, NodeDefinition[]> = {
        platform: [],
        vision: [],
        flow: [],
    };
    NODE_DEFINITIONS.forEach(n => {
        grouped[n.category].push(n);
    });
    return grouped;
}

/** Get the default config for a node type */
export function getDefaultConfig(type: string): Record<string, any> {
    const def = getNodeDef(type);
    if (!def) return {};
    const config: Record<string, any> = {};
    def.params.forEach(p => {
        if (p.defaultValue !== undefined) {
            config[p.key] = p.defaultValue;
        }
    });
    return config;
}
