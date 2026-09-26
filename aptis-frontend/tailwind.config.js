/** @type {import('tailwindcss').Config} */

/**
 * Token giao diện mới (mock "Aptis Practice App", 09/2026).
 *
 * Giữ nguyên TÊN token cũ (brand, surface, border…) và chỉ đổi GIÁ TRỊ: hơn
 * trăm file đang viết bg-brand-600 hay border-border, đổi tên thì phải sửa tay
 * từng chỗ và sót một chỗ là lệch màu. Đổi giá trị thì cả hệ thống sang màu mới
 * cùng lúc.
 *
 * brand trước là tím điện #5b52e8, nay là thang "mực" slate: nút chính trong
 * mock là mực #0F172A trên nền trắng, không có màu thương hiệu riêng. Màu thật
 * sự mang nghĩa nằm ở `skill` — mỗi kỹ năng một màu, dùng thống nhất ở icon,
 * nhãn, thanh tiến độ.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        // Nội dung được nhân đôi, dịch đúng một nửa nên vòng lặp liền mạch.
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Hiện dần khi vào trang, như các khối trong mock.
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        // Sóng âm lúc AI nói hoặc đang ghi âm.
        wave: {
          '0%': { transform: 'scaleY(.35)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        rise: 'rise .5s cubic-bezier(.2,.8,.2,1) both',
        wave: 'wave .5s ease-in-out infinite alternate',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0F172A',
          soft: '#334155',
          mute: '#64748B',
          faint: '#94A3B8',
        },
        brand: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#475569',
          600: '#0F172A',
          700: '#0B1222',
          800: '#0F172A',
          900: '#0B1222',
          950: '#020617',
        },
        // Màu từng kỹ năng, lấy đúng từ mock. fg dùng cho chữ/icon/thanh tiến
        // độ, bg là nền nhạt của thẻ và icon.
        skill: {
          speaking: '#15803D',
          'speaking-bg': '#ECFDF3',
          writing: '#BE185D',
          'writing-bg': '#FDF2F8',
          listening: '#B45309',
          'listening-bg': '#FFFBEB',
          reading: '#1D4ED8',
          'reading-bg': '#EFF6FF',
          gv: '#6D28D9',
          'gv-bg': '#F5F3FF',
        },
        // Sidebar trung tâm quản trị.
        admin: {
          DEFAULT: '#0B3B2E',
          fg: '#D1E4DC',
          hover: '#134A3B',
        },
        // accent cũ là xanh chanh neon; mock dùng xanh lá cho chấm "đang hoạt
        // động" (Premium còn hạn, phiên đang diễn ra).
        accent: {
          DEFAULT: '#22C55E',
          light: '#4ADE80',
          dark: '#15803D',
          ink: '#0F172A',
        },
        dark: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          muted: '#94A3B8',
          subtle: '#1E293B',
        },
        surface: {
          DEFAULT: '#FAFBFC',
          paper: '#F8FAFC',
          card: '#FFFFFF',
          muted: '#F1F5F9',
        },
        border: {
          DEFAULT: '#E5E9F0',
          subtle: '#F1F5F9',
          strong: '#CBD5E1',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
