import { useTranslation } from 'react-i18next'
import { MdLanguage } from 'react-icons/md'

const LocaleSelector = () => {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <div className="flex gap-4">
      <button
        className={`btn btn-lg flex-1 ${
          i18n.language === 'zh-TW' ? 'btn-primary' : 'btn-outline'
        }`}
        onClick={() => handleLanguageChange('zh-TW')}
      >
        <MdLanguage className="text-xl" />
        {t('ui.setting.locale.zhTW')}
      </button>
      <button
        className={`btn btn-lg flex-1 ${
          i18n.language === 'en' ? 'btn-primary' : 'btn-outline'
        }`}
        onClick={() => handleLanguageChange('en')}
      >
        <MdLanguage className="text-xl" />
        {t('ui.setting.locale.en')}
      </button>
    </div>
  )
}

export default LocaleSelector

