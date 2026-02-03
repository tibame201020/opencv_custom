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
        name: 'click',
        params: 'x: float, y: float, device_id: str = None',
        desc: '點擊座標 (x, y)',
        example: 'self.platform.click(100, 200, self.deviceId)',
        platform: 'android'
    },
    {
        name: 'swipe',
        params: 'x1, y1, x2, y2, device_id: str = None',
        desc: '滑動 (不指定持續時間)',
        example: 'self.platform.swipe(100, 100, 200, 500, self.deviceId)',
        platform: 'android'
    },
    {
        name: 'swipe_with_duration',
        params: 'x1, y1, x2, y2, duration_ms: int, device_id: str = None',
        desc: '滑動 (指定毫秒)',
        example: 'self.platform.swipe_with_duration(100, 100, 200, 500, 300, self.deviceId)',
        platform: 'android'
    },
    {
        name: 'type_text',
        params: 'text: str, device_id: str = None',
        desc: '輸入文字',
        example: 'self.platform.type_text("Hello", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'key_event',
        params: 'adb_key_code: str, device_id: str = None',
        desc: '發送按鍵事件 (如 KEYCODE_HOME)',
        example: 'self.platform.key_event("KEYCODE_BACK", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'click_image',
        params: 'image_path: str, region: OcrRegion, device_id: str = None',
        desc: '在指定區域尋找並點擊圖片',
        example: 'self.platform.click_image(f"{self.image_root}/btn.png", OcrRegion(0, 0, 100, 100), self.deviceId)',
        platform: 'android'
    },
    {
        name: 'find_image_full',
        params: 'image_path: str, device_id: str = None',
        desc: '全螢幕尋找圖片',
        example: 'found, point = self.platform.find_image_full(f"{self.image_root}/target.png", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'click_image_full',
        params: 'image_path: str, device_id: str = None',
        desc: '全螢幕尋找並點擊圖片 (回傳 bool)',
        example: 'success = self.platform.click_image_full(f"{self.image_root}/btn.png", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'click_image_with_similar',
        params: 'image_path: str, similar: float, device_id: str = None',
        desc: '全螢幕尋找並點擊圖片 (指定相似度)',
        example: 'self.platform.click_image_with_similar(f"{self.image_root}/btn.png", 0.9, self.deviceId)',
        platform: 'android'
    },
    {
        name: 'take_snapshot',
        params: 'device_id: str = None',
        desc: '取得截圖物件 (OpenCV Mat)',
        example: 'mat = self.platform.take_snapshot(self.deviceId)',
        platform: 'android'
    },
    {
        name: 'start_app',
        params: 'package: str, device_id: str = None',
        desc: '啟動應用程式',
        example: 'self.platform.start_app("com.example.app", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'stop_app',
        params: 'package: str, device_id: str = None',
        desc: '強制停止應用程式',
        example: 'self.platform.stop_app("com.example.app", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'exec',
        params: 'command: str',
        desc: '發送原生 ADB 命令。會自動注入目前裝置 ID 並解析 adb 執行檔路徑。',
        example: 'self.platform.exec("adb shell wm size")',
        platform: 'android'
    },
    {
        name: 'adb: Get Model',
        params: '',
        desc: '取得行動裝置型號',
        example: 'model = self.platform.exec("adb shell getprop ro.product.model")',
        platform: 'android'
    },
    {
        name: 'adb: Package Activity',
        params: '',
        desc: '取得目前前景運行的 Activity',
        example: 'activity = self.platform.exec("adb shell dumpsys window | grep mCurrentFocus")',
        platform: 'android'
    },
    {
        name: 'adb: List Packages',
        params: '',
        desc: '列出所有已安裝的套件',
        example: 'packages = self.platform.exec("adb shell pm list packages")',
        platform: 'android'
    },
    {
        name: 'adb: Screenshot (Pull)',
        params: '',
        desc: '使用原生命令截圖到裝置並拉回電腦',
        example: 'self.platform.exec("adb shell screencap -p /sdcard/s.png")\nself.platform.exec("adb pull /sdcard/s.png .")',
        platform: 'android'
    },
    {
        name: 'adb: Unlock Screen',
        params: '',
        desc: '模擬按下電源鍵與解鎖',
        example: 'self.platform.exec("adb shell input keyevent 26")\nself.platform.exec("adb shell input keyevent 82")',
        platform: 'android'
    },
    {
        name: 'sleep',
        params: 'seconds: int',
        desc: '程式暫停 (秒)',
        example: 'self.platform.sleep(1)',
        platform: 'both'
    },
    // Desktop
    {
        name: 'mouse_move',
        params: 'x: int, y: int',
        desc: '移動滑鼠 (Desktop)',
        example: 'self.platform.mouse_move(500, 500)',
        platform: 'desktop'
    },
    {
        name: 'click',
        params: 'x: int, y: int',
        desc: '點擊滑鼠 (Desktop)',
        example: 'self.platform.click(500, 500)',
        platform: 'desktop'
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
