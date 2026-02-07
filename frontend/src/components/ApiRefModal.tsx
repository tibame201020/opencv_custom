import React, { useState } from 'react';
import { X, Search, Smartphone, Monitor, Code, Check, Copy } from 'lucide-react';
import clsx from 'clsx';

interface ApiMethod {
    name: string;
    params: string;
    desc: string;
    example: string;
    platform: 'android' | 'desktop' | 'both';
}

const API_DATA: ApiMethod[] = [
    {
        name: 'tap',
        params: 'image_name: str, threshold: float = None, region: OcrRegion = None',
        desc: '在螢幕搜尋圖片並點擊。路徑會自動補完成 images/ 目錄。',
        example: 'self.tap("login_button.png")',
        platform: 'both'
    },
    {
        name: 'find',
        params: 'image_name: str, threshold: float = None, region: OcrRegion = None',
        desc: '搜尋圖片並回傳結果 (Found, Point)。',
        example: 'found, pt = self.find("target.png")\nif found:\n    self.click(pt[0], pt[1])',
        platform: 'both'
    },
    {
        name: 'wait_tap',
        params: 'image_name: str, timeout: int = 10',
        desc: '等待圖片出現並點擊，直到超時。',
        example: 'self.wait_tap("start_icon.png", timeout=15)',
        platform: 'both'
    },
    {
        name: 'click',
        params: 'x: float, y: float',
        desc: '點擊螢幕上的座標 (x, y)。',
        example: 'self.click(500, 300)',
        platform: 'both'
    },
    {
        name: 'swipe',
        params: 'x1, y1, x2, y2, duration: int = 500',
        desc: '從點 A 滑動到點 B。',
        example: 'self.swipe(100, 500, 100, 100, duration=300)',
        platform: 'android'
    },
    {
        name: 'ocr_text',
        params: 'path: str, region: OcrRegion',
        desc: '在指定圖片或螢幕區域進行文字辨識。',
        example: 'text = self.ocr_text("screenshot.png", OcrRegion(0, 0, 200, 50))',
        platform: 'both'
    },
    {
        name: 'sleep',
        params: 'seconds: float',
        desc: '暫停腳本執行。',
        example: 'self.sleep(2.5)',
        platform: 'both'
    },
    {
        name: 'log',
        params: 'message: str, type: str = "info"',
        desc: '輸出日誌到控制台。',
        example: 'self.log("任務完成")',
        platform: 'both'
    },
    {
        name: 'key_event',
        params: 'adb_key_code: str',
        desc: '發送 Android 按鍵事件。',
        example: 'self.key_event("KEYCODE_BACK")',
        platform: 'android'
    },
    {
        name: 'start_app',
        params: 'package: str',
        desc: '啟動指定的應用程式套件。',
        example: 'self.start_app("com.android.settings")',
        platform: 'android'
    }
];

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            className={clsx(
                "btn btn-xs btn-square transition-all duration-300",
                copied ? "btn-success shadow-sm shadow-success/20" : "btn-ghost hover:bg-base-300"
            )}
            onClick={handleCopy}
            title="Click to copy example"
        >
            {copied ? <Check size={12} className="text-success-content" /> : <Copy size={12} className="opacity-60" />}
        </button>
    );
};

interface ApiRefModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ApiRefModal: React.FC<ApiRefModalProps> = ({ isOpen, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'android' | 'desktop'>('all');

    if (!isOpen) return null;

    const filteredApi = API_DATA.filter(api => {
        const matchesSearch = api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            api.desc.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || api.platform === filter || api.platform === 'both';
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden bg-base-100 rounded-2xl border border-base-300 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <div className="p-5 border-b border-base-300 flex items-center justify-between bg-base-200/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Code className="text-primary" size={20} />
                        </div>
                        <h3 className="font-bold text-xl tracking-tight">Python API Reference</h3>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost hover:bg-error/10 hover:text-error transition-colors" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="p-4 bg-base-100 flex gap-4 items-center border-b border-base-200">
                    <div className="join bg-base-200 p-1 rounded-xl">
                        <button
                            className={`btn btn-sm join-item border-none ${filter === 'all' ? 'btn-primary shadow-md' : 'btn-ghost opacity-60'}`}
                            onClick={() => setFilter('all')}
                        >All</button>
                        <button
                            className={`btn btn-sm join-item border-none ${filter === 'android' ? 'btn-primary shadow-md' : 'btn-ghost opacity-60'}`}
                            onClick={() => setFilter('android')}
                        ><Smartphone size={14} className="mr-1" /> Android</button>
                        <button
                            className={`btn btn-sm join-item border-none ${filter === 'desktop' ? 'btn-primary shadow-md' : 'btn-ghost opacity-60'}`}
                            onClick={() => setFilter('desktop')}
                        ><Monitor size={14} className="mr-1" /> Desktop</button>
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                        <input
                            type="text"
                            placeholder="Search methods, parameters or descriptions..."
                            className="input input-bordered w-full pl-12 bg-base-200 border-none focus:bg-base-300 transition-all rounded-xl h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-base-100">
                    {filteredApi.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 opacity-20">
                            <Search size={64} className="mb-4" />
                            <div className="text-xl">No matching methods found</div>
                        </div>
                    ) : (
                        filteredApi.map((api, idx) => (
                            <div key={idx} className="group relative">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <span className="text-primary font-bold font-mono text-lg group-hover:text-primary-focus transition-colors">{api.name}</span>
                                            <div className="flex gap-1.5">
                                                {(api.platform === 'android' || api.platform === 'both') && <div title="Android" className="badge badge-xs badge-outline badge-primary border-primary/30 text-primary/80 px-1">ADB</div>}
                                                {(api.platform === 'desktop' || api.platform === 'both') && <div title="Desktop" className="badge badge-xs badge-outline badge-secondary border-secondary/30 text-secondary/80 px-1">ROBOT</div>}
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono mt-1 text-base-content/60 break-all">{api.params}</div>
                                    </div>
                                </div>

                                <p className="text-sm text-base-content/80 mb-4 font-sans leading-relaxed">
                                    {api.desc}
                                </p>

                                <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-200/50 shadow-inner group-hover:bg-base-200 transition-colors">
                                    <div className="flex items-center justify-between px-4 py-2 bg-base-300/50 border-b border-base-300/30">
                                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-50">Example Code</div>
                                        <CopyButton text={api.example} />
                                    </div>
                                    <div className="p-4 font-mono text-sm overflow-x-auto whitespace-nowrap text-base-content selection:bg-primary/20">
                                        {api.example}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-base-300 bg-base-200 text-xs opacity-50 flex justify-between">
                    <span>TIP: Use <code>self.platform.[method]</code> in your scripts.</span>
                    <span>Total Methods: {filteredApi.length}</span>
                </div>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
};
