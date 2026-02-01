import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Check, Globe } from 'lucide-react';
import clsx from 'clsx';

const THEMES = [
    "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave",
    "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua",
    "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula",
    "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter"
];

export const SettingsView: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { theme, setTheme, setLanguage } = useAppStore();

    return (
        <div className="h-full w-full p-6 bg-base-100 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6 pb-12">
                {/* Header & Global Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{t('ui.setting.title')}</h2>
                        <p className="text-sm opacity-60">Customize workspace appearance</p>
                    </div>

                    {/* Compact Language Toggle */}
                    <div className="flex items-center gap-3 bg-base-200/50 p-2 rounded-lg">
                        <Globe size={16} className="opacity-60" />
                        <span className="text-sm font-medium opacity-60 uppercase tracking-wider">{t('ui.setting.locale')}</span>
                        <div className="join shadow-sm">
                            <button
                                className={clsx("join-item btn btn-xs px-3", i18n.language === 'zh' ? 'btn-primary' : 'btn-ghost bg-base-100')}
                                onClick={() => { i18n.changeLanguage('zh'); setLanguage('zh'); }}
                            >
                                中文
                            </button>
                            <button
                                className={clsx("join-item btn btn-xs px-3", i18n.language === 'en' ? 'btn-primary' : 'btn-ghost bg-base-100')}
                                onClick={() => { i18n.changeLanguage('en'); setLanguage('en'); }}
                            >
                                EN
                            </button>
                        </div>
                    </div>
                </div>

                {/* Theme Grid (Compact) */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold opacity-80">{t('ui.setting.theme')}</h3>
                        <span className="text-xs opacity-40 font-mono">{THEMES.length} variants</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {THEMES.map((tName) => (
                            <div
                                key={tName}
                                className={clsx(
                                    "border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                                    theme === tName ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-base-200 opacity-70 hover:opacity-100"
                                )}
                                onClick={() => setTheme(tName)}
                            >
                                <div data-theme={tName} className="bg-base-100 text-base-content p-2 relative pointer-events-none h-20 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="text-xs font-bold capitalize truncate pr-2">{tName}</div>
                                        {theme === tName && (
                                            <div className="text-primary"><Check size={12} strokeWidth={4} /></div>
                                        )}
                                    </div>

                                    <div className="flex gap-1 mt-1">
                                        <div className="flex-1 h-2 rounded-sm bg-primary"></div>
                                        <div className="flex-1 h-2 rounded-sm bg-secondary"></div>
                                        <div className="flex-1 h-2 rounded-sm bg-accent"></div>
                                        <div className="flex-1 h-2 rounded-sm bg-neutral"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
