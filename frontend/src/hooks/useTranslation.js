import { useLanguage } from '@/store/useLanguage';
import { translations } from '@/lib/i18n/translations';

export const useTranslation = () => {
    const { language, setLanguage } = useLanguage();

    const t = (key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    };

    return { t, language, setLanguage };
};
