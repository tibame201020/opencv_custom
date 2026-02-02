import React, { useState } from 'react';
import { X, Search, Smartphone, Monitor, Code } from 'lucide-react';

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
        name: 'find_image_full',
        params: 'image_path: str, device_id: str = None',
        desc: '全螢幕尋找圖片',
        example: 'found, point = self.platform.find_image_full("target.png", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'click_image_full',
        params: 'image_path: str, device_id: str = None',
        desc: '全螢幕尋找並點擊圖片 (回傳 bool)',
        example: 'success = self.platform.click_image_full("btn.png", self.deviceId)',
        platform: 'android'
    },
    {
        name: 'click_image_with_similar',
        params: 'image_path: str, similar: float, device_id: str = None',
        desc: '全螢幕尋找並點擊圖片 (指定相似度)',
        example: 'self.platform.click_image_with_similar("btn.png", 0.9, self.deviceId)',
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
            <div className="modal-box max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-base-100 rounded-xl border border-base-300 shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200">
                    <div className="flex items-center gap-2">
                        <Code className="text-primary" />
                        <h3 className="font-bold text-lg">Python API Reference</h3>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="p-4 bg-base-100 flex gap-4 items-center">
                    <div className="join">
                        <button
                            className={`btn btn-sm join-item ${filter === 'all' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                            onClick={() => setFilter('all')}
                        >All</button>
                        <button
                            className={`btn btn-sm join-item ${filter === 'android' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                            onClick={() => setFilter('android')}
                        ><Smartphone size={14} className="mr-1" /> Android</button>
                        <button
                            className={`btn btn-sm join-item ${filter === 'desktop' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                            onClick={() => setFilter('desktop')}
                        ><Monitor size={14} className="mr-1" /> Desktop</button>
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                        <input
                            type="text"
                            placeholder="Search methods or description..."
                            className="input input-sm input-bordered w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-2">
                    {filteredApi.length === 0 ? (
                        <div className="text-center py-20 opacity-30">No matching methods found</div>
                    ) : (
                        filteredApi.map((api, idx) => (
                            <div key={idx} className="bg-base-200/50 rounded-lg border border-base-300 p-4 hover:border-primary/50 transition-colors group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary font-bold font-mono text-base">{api.name}</span>
                                        <span className="text-xs opacity-50 font-mono">({api.params})</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {(api.platform === 'android' || api.platform === 'both') && <Smartphone size={12} className="opacity-30" />}
                                        {(api.platform === 'desktop' || api.platform === 'both') && <Monitor size={12} className="opacity-30" />}
                                    </div>
                                </div>
                                <div className="text-sm border-l-2 border-primary/20 pl-3 mb-3 text-base-content/80">
                                    {api.desc}
                                </div>
                                <div className="bg-base-300 rounded p-2 text-xs font-mono relative group-hover:bg-base-200 transition-colors">
                                    <div className="text-primary/50 mb-1 opacity-50">Example:</div>
                                    <code className="text-primary-focus cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(api.example);
                                            // showToast logic here would be nice but we don't have it imported easily
                                        }}
                                        title="Click to copy example"
                                    >
                                        {api.example}
                                    </code>
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
