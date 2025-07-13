import { api } from './api';

export interface WebsiteSettings {
  siteName: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  bannerImage: string;
  backgroundImage: string;
  headerText: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  googleAnalytics: string;
  facebookPixel: string;
  socialLinks: {
    youtube: string;
    facebook: string;
    tiktok: string;
    zalo: string;
    instagram: string;
    linkedin: string;
  };
  contactInfo: {
    address: string;
    phone: string;
    email: string;
    workingHours: string;
  };
  bannerSlides: BannerSlide[];
}

export interface BannerSlide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  order: number;
  isActive: boolean;
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  data: WebsiteSettings;
}

class SettingsService {
  // Get all settings (public endpoint)
  static async getPublicSettings(): Promise<WebsiteSettings> {
    try {
      const response = await api.get('/settings/public');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi lấy cài đặt website');
    }
  }

  // Get all settings (admin only)
  static async getAllSettings(): Promise<WebsiteSettings> {
    try {
      const response = await api.get('/settings');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi lấy cài đặt website');
    }
  }

  // Update settings (admin only)
  static async updateSettings(settings: Partial<WebsiteSettings>): Promise<SettingsResponse> {
    try {
      const response = await api.put('/settings', settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi cập nhật cài đặt');
    }
  }

  // Update specific setting (admin only)
  static async updateSpecificSetting(key: string, value: any): Promise<SettingsResponse> {
    try {
      const response = await api.put(`/settings/key/${key}`, { value });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi cập nhật cài đặt');
    }
  }

  // Reset settings to default (admin only)
  static async resetSettings(): Promise<SettingsResponse> {
    try {
      const response = await api.post('/settings/reset');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi reset cài đặt');
    }
  }

  // Banner slides management
  static async addBannerSlide(slide: Omit<BannerSlide, 'id'>): Promise<SettingsResponse> {
    try {
      const response = await api.post('/settings/banner-slides', slide);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi thêm banner slide');
    }
  }

  static async updateBannerSlide(slideId: string, slide: Partial<BannerSlide>): Promise<SettingsResponse> {
    try {
      const response = await api.put(`/settings/banner-slides/${slideId}`, slide);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi cập nhật banner slide');
    }
  }

  static async deleteBannerSlide(slideId: string): Promise<SettingsResponse> {
    try {
      const response = await api.delete(`/settings/banner-slides/${slideId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi xóa banner slide');
    }
  }

  // Helper methods
  static getDefaultSettings(): WebsiteSettings {
    return {
      siteName: 'LinhMai Academy',
      logo: '',
      favicon: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      fontFamily: 'Inter, sans-serif',
      bannerImage: '',
      backgroundImage: '',
      headerText: 'Nền tảng học tập trực tuyến hàng đầu',
      footerText: 'Tất cả quyền được bảo lưu.',
      seoTitle: 'LinhMai Academy - Nền tảng học tập trực tuyến',
      seoDescription: 'Học tập trực tuyến với các khóa học chất lượng cao',
      seoKeywords: 'học tập, trực tuyến, khóa học, giáo dục',
      googleAnalytics: '',
      facebookPixel: '',
      socialLinks: {
        youtube: '',
        facebook: '',
        tiktok: '',
        zalo: '',
        instagram: '',
        linkedin: ''
      },
      contactInfo: {
        address: '',
        phone: '',
        email: '',
        workingHours: ''
      },
      bannerSlides: []
    };
  }

  static validateColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static generateCSSVariables(settings: WebsiteSettings): string {
    return `
      :root {
        --primary-color: ${settings.primaryColor};
        --secondary-color: ${settings.secondaryColor};
        --font-family: ${settings.fontFamily};
      }
    `;
  }

  static applySettingsToDOM(settings: WebsiteSettings): void {
    // Update document title
    if (settings.seoTitle) {
      document.title = settings.seoTitle;
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && settings.seoDescription) {
      metaDescription.setAttribute('content', settings.seoDescription);
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords && settings.seoKeywords) {
      metaKeywords.setAttribute('content', settings.seoKeywords);
    }

    // Update favicon
    if (settings.favicon) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = settings.favicon;
      }
    }

    // Apply CSS variables
    const style = document.createElement('style');
    style.textContent = this.generateCSSVariables(settings);
    document.head.appendChild(style);

    // Add Google Analytics
    if (settings.googleAnalytics) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalytics}`;
      document.head.appendChild(script);

      const configScript = document.createElement('script');
      configScript.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.googleAnalytics}');
      `;
      document.head.appendChild(configScript);
    }

    // Add Facebook Pixel
    if (settings.facebookPixel) {
      const script = document.createElement('script');
      script.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${settings.facebookPixel}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }
  }
}

export default SettingsService;
