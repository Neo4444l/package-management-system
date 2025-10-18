import React, { createContext, useState, useContext, useEffect } from 'react'
import { zh } from '../locales/zh'
import { en } from '../locales/en'

const LanguageContext = createContext()

const translations = {
  zh,
  en,
}

export function LanguageProvider({ children }) {
  // 从localStorage读取保存的语言设置，默认中文
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language')
    return saved || 'zh'
  })

  // 保存语言设置到localStorage
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    // 如果找不到翻译，返回key
    if (!value) return key
    
    // 替换参数 {param} 格式
    let result = value
    Object.keys(params).forEach(param => {
      result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param])
    })
    
    return result
  }

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang)
    }
  }

  const value = {
    language,
    changeLanguage,
    t,
    isZh: language === 'zh',
    isEn: language === 'en',
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

export default LanguageContext

