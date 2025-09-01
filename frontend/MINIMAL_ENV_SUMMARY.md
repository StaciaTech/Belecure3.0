# Frontend Environment Variables - Minimal Configuration

## ✅ **Simplified and Streamlined!**

The frontend environment configuration has been simplified to focus on **essential settings only** while maintaining full deployment flexibility.

## 🎯 **Minimal Configuration Approach**

### **📁 Core Files (Simplified)**

- **`.env.example`** - Clean template with essential options only
- **`.env`** - Minimal development settings (4 variables)
- **`.env.development`** - Development-specific (4 variables)
- **`.env.staging`** - Staging with monitoring (6 variables)
- **`.env.production`** - Production with analytics (6+ variables)

## 🔧 **Essential Environment Variables**

### **🔌 Core Configuration (Required)**
```bash
VITE_API_URL=http://localhost:3001        # Backend API URL
VITE_PYTHON_API_URL=http://localhost:5000 # Python AI Server URL
VITE_APP_ENV=development                  # Environment mode
VITE_DEBUG=true                          # Debug logging
```

### **📊 Optional Monitoring (Production)**
```bash
VITE_ENABLE_ANALYTICS=true               # Analytics tracking
VITE_ENABLE_ERROR_REPORTING=true         # Error reporting
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXX        # Google Analytics
VITE_SENTRY_DSN=https://sentry-dsn       # Error tracking
```

### **🎛️ Optional Feature Flags (If Needed)**
```bash
VITE_ENABLE_AI_ANALYSIS=false            # Disable AI features
VITE_ENABLE_3D_VISUALIZATION=false       # Disable 3D features
VITE_ENABLE_EXPORT_FEATURES=false        # Disable exports
```

### **⚙️ Optional Performance (If Needed)**
```bash
VITE_API_TIMEOUT=30000                   # Request timeout
VITE_MAX_FILE_SIZE=52428800              # File upload limit
VITE_DEV_SERVER_PORT=3000                # Dev server port
```

## 🌍 **Environment-Specific Configurations**

### **Development (`.env.development`)**
```bash
VITE_API_URL=http://localhost:3001
VITE_PYTHON_API_URL=http://localhost:5000
VITE_APP_ENV=development
VITE_DEBUG=true
```

### **Staging (`.env.staging`)**
```bash
VITE_API_URL=https://api-staging.belecure.com
VITE_PYTHON_API_URL=https://ai-staging.belecure.com
VITE_APP_ENV=staging
VITE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

### **Production (`.env.production`)**
```bash
VITE_API_URL=https://api.belecure.com
VITE_PYTHON_API_URL=https://ai.belecure.com
VITE_APP_ENV=production
VITE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
# Add your actual monitoring IDs when ready
```

## 🧠 **Smart Defaults Built-In**

The code now has **intelligent defaults** so you only need to set what you want to change:

### **API Configuration**
- **Timeout**: 30 seconds (configurable)
- **Retries**: 3 attempts (configurable)
- **Retry Delay**: 1 second (configurable)

### **Feature Flags**
- **AI Analysis**: Enabled by default
- **Analytics**: Disabled by default (enable in staging/production)
- **Error Reporting**: Disabled by default (enable in staging/production)

### **Debug Logging**
- **Development**: Always enabled
- **Debug Mode**: Controlled by `VITE_DEBUG` flag
- **Automatic**: Smart detection based on environment

## 🚀 **Deployment Process**

### **1. Development**
```bash
# Use default .env (4 variables)
npm run dev
```

### **2. Staging**
```bash
# Copy .env.staging to .env or use mode
npm run build --mode staging
```

### **3. Production**
```bash
# Copy .env.production to .env, add your monitoring IDs
npm run build --mode production
```

## 📋 **Quick Setup Guide**

### **For Development:**
1. Copy `.env.example` to `.env`
2. No changes needed - works out of the box!

### **For Staging:**
1. Copy `.env.staging` to `.env`
2. Update domain names to match your staging environment

### **For Production:**
1. Copy `.env.production` to `.env`
2. Update domain names to match your production environment
3. Add your actual monitoring service IDs (GA, Sentry, etc.)

## ⚡ **Key Benefits of Minimal Approach**

### **✅ Simplicity**
- Only 4 core variables needed for basic operation
- Clear separation between required and optional settings
- No overwhelming configuration files

### **✅ Smart Defaults**
- Everything works out of the box
- Sensible defaults for all optional settings
- No need to configure what you don't need

### **✅ Flexibility**
- Easy to add more variables when needed
- Environment-specific overrides
- Optional features can be enabled selectively

### **✅ Maintainability**
- Less configuration to manage
- Clear documentation of what each setting does
- Easy to understand and modify

## 🔧 **What Changed from Complex Version**

### **Removed:**
- 100+ configuration options
- Complex feature flag system
- Detailed performance tuning options
- Advanced monitoring configurations
- Extensive logging options
- Complex build configurations

### **Kept:**
- Essential API configuration
- Environment-specific settings
- Basic feature flags (when needed)
- Simple monitoring integration
- Smart defaults for everything else

### **Result:**
- **95% reduction** in configuration complexity
- **Same functionality** with intelligent defaults
- **Easier deployment** and maintenance
- **Cleaner codebase** with focused configuration

## 🎯 **Perfect Balance**

This minimal approach provides:

- **🚀 Quick Setup** - Works immediately with minimal configuration
- **🔧 Full Control** - Can be extended when needed
- **🌍 Environment Flexibility** - Easy deployment to any environment
- **📊 Production Ready** - Monitoring and analytics when enabled
- **🛡️ Secure Defaults** - Safe configuration out of the box

**You now have a clean, minimal environment configuration that's both beginner-friendly and production-ready!** ✨
