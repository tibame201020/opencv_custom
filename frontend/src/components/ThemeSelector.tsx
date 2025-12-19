import { useState, useEffect } from 'react'

const themes = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
  'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
  'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
  'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
  'night', 'coffee', 'winter', 'dim'
]

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setCurrentTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme)
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {themes.map((theme) => (
        <button
          key={theme}
          data-theme={theme}
          className={`
            rounded-lg p-4 transition-all duration-200
            border-2 ${currentTheme === theme ? 'border-primary' : 'border-base-300'}
            hover:border-primary hover:scale-105
            bg-base-100
          `}
          onClick={() => handleThemeChange(theme)}
        >
          <div className="flex flex-col gap-2">
            <div className="font-semibold text-base-content capitalize text-center mb-2">
              {theme}
            </div>
            <div className="flex gap-1 justify-center">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-content text-xs font-bold">
                A
              </div>
              <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-secondary-content text-xs font-bold">
                A
              </div>
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-accent-content text-xs font-bold">
                A
              </div>
              <div className="w-6 h-6 rounded bg-neutral flex items-center justify-center text-neutral-content text-xs font-bold">
                A
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default ThemeSelector

