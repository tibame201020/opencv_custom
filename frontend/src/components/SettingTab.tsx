import { useTranslation } from 'react-i18next'
import ThemeSelector from './ThemeSelector'
import LocaleSelector from './LocaleSelector'

const SettingTab = () => {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Theme Setting */}
      <fieldset className="border border-base-300 rounded-lg p-6">
        <legend className="text-lg font-semibold px-2">
          {t('ui.setting.theme.title')}
        </legend>
        <p className="text-sm text-base-content/70 mb-4">
          {t('ui.setting.theme.description')}
        </p>
        <ThemeSelector />
      </fieldset>

      {/* Locale Setting */}
      <fieldset className="border border-base-300 rounded-lg p-6">
        <legend className="text-lg font-semibold px-2">
          {t('ui.setting.locale.title')}
        </legend>
        <p className="text-sm text-base-content/70 mb-4">
          {t('ui.setting.locale.description')}
        </p>
        <LocaleSelector />
      </fieldset>
    </div>
  )
}

export default SettingTab

