const fs = require('fs');
const path = require('path');

// Path to settings file
const SETTINGS_FILE = path.join(__dirname, '../config/settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  siteName: 'LinhMai Academy',
  logo: '',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  bannerImage: '',
  backgroundImage: '',
  headerText: 'Nền tảng học tập trực tuyến hàng đầu',
  footerText: 'Tất cả quyền được bảo lưu.',
  seoTitle: 'LinhMai Academy - Học tập trực tuyến',
  seoDescription: 'Nền tảng học tập trực tuyến với các khóa học chất lượng cao',
  favicon: '',
  fontFamily: 'Inter, sans-serif',
  socialLinks: {
    youtube: '',
    facebook: '',
    tiktok: '',
    zalo: ''
  },
  analytics: {
    googleAnalytics: '',
    facebookPixel: ''
  },
  contact: {
    address: '',
    phone: '',
    email: '',
    workingHours: ''
  },
  bannerSlides: []
};

class SettingsController {
  // Lấy tất cả cài đặt
  static async getAllSettings(req, res) {
    try {
      const settings = SettingsController.loadSettings();
      
      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('Get settings error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy cài đặt',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật cài đặt
  static async updateSettings(req, res) {
    try {
      const currentSettings = SettingsController.loadSettings();
      const updatedSettings = { ...currentSettings, ...req.body };
      
      // Validate required fields
      if (updatedSettings.siteName && updatedSettings.siteName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Tên website không được quá 100 ký tự'
        });
      }

      // Save settings
      SettingsController.saveSettings(updatedSettings);
      
      res.json({
        success: true,
        message: 'Cập nhật cài đặt thành công',
        data: updatedSettings
      });

    } catch (error) {
      console.error('Update settings error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật cài đặt',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật cài đặt cụ thể
  static async updateSpecificSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Key và value là bắt buộc'
        });
      }

      const currentSettings = SettingsController.loadSettings();
      
      // Handle nested keys (e.g., 'socialLinks.facebook')
      const keys = key.split('.');
      let target = currentSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }
      
      target[keys[keys.length - 1]] = value;
      
      SettingsController.saveSettings(currentSettings);
      
      res.json({
        success: true,
        message: 'Cập nhật cài đặt thành công',
        data: currentSettings
      });

    } catch (error) {
      console.error('Update specific setting error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật cài đặt',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Reset về cài đặt mặc định
  static async resetSettings(req, res) {
    try {
      SettingsController.saveSettings(DEFAULT_SETTINGS);
      
      res.json({
        success: true,
        message: 'Đã reset về cài đặt mặc định',
        data: DEFAULT_SETTINGS
      });

    } catch (error) {
      console.error('Reset settings error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi reset cài đặt',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Thêm slide banner
  static async addBannerSlide(req, res) {
    try {
      const { title, description, imageUrl, linkUrl, order } = req.body;
      
      if (!title || !imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề và hình ảnh là bắt buộc'
        });
      }

      const settings = SettingsController.loadSettings();
      
      const newSlide = {
        id: Date.now().toString(),
        title,
        description: description || '',
        imageUrl,
        linkUrl: linkUrl || '',
        order: order || settings.bannerSlides.length + 1,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      settings.bannerSlides.push(newSlide);
      settings.bannerSlides.sort((a, b) => a.order - b.order);
      
      SettingsController.saveSettings(settings);
      
      res.json({
        success: true,
        message: 'Thêm slide banner thành công',
        data: newSlide
      });

    } catch (error) {
      console.error('Add banner slide error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi thêm slide banner',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật slide banner
  static async updateBannerSlide(req, res) {
    try {
      const { slideId } = req.params;
      const updateData = req.body;
      
      const settings = SettingsController.loadSettings();
      const slideIndex = settings.bannerSlides.findIndex(slide => slide.id === slideId);
      
      if (slideIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Slide không tồn tại'
        });
      }

      settings.bannerSlides[slideIndex] = {
        ...settings.bannerSlides[slideIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      if (updateData.order) {
        settings.bannerSlides.sort((a, b) => a.order - b.order);
      }
      
      SettingsController.saveSettings(settings);
      
      res.json({
        success: true,
        message: 'Cập nhật slide banner thành công',
        data: settings.bannerSlides[slideIndex]
      });

    } catch (error) {
      console.error('Update banner slide error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật slide banner',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Xóa slide banner
  static async deleteBannerSlide(req, res) {
    try {
      const { slideId } = req.params;
      
      const settings = SettingsController.loadSettings();
      const slideIndex = settings.bannerSlides.findIndex(slide => slide.id === slideId);
      
      if (slideIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Slide không tồn tại'
        });
      }

      settings.bannerSlides.splice(slideIndex, 1);
      SettingsController.saveSettings(settings);
      
      res.json({
        success: true,
        message: 'Xóa slide banner thành công'
      });

    } catch (error) {
      console.error('Delete banner slide error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa slide banner',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Helper methods
  static loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...settings };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error.message);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings) {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error.message);
      throw error;
    }
  }
}

module.exports = {
  SettingsController
};
