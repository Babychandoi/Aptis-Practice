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
      // Chuyển động lấy đúng giá trị từ hai mock (hm*). Mỗi keyframe khai báo
      // một lần ở đây; index.css tắt hết khi người dùng bật "giảm chuyển động".
      // Chỉ animate transform/opacity (word thêm filter như mock) để không
      // gây reflow.
      keyframes: {
        // Nội dung được nhân đôi, dịch đúng một nửa nên vòng lặp liền mạch.
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // hmin: hiện dần và nhô lên khi vào trang.
        in: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Bản nhẹ của hmin dùng trong trang làm bài (14px).
        'in-sm': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // hmslide: trượt vào từ bên phải khi đổi bộ đề/part/kỹ năng.
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(28px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // hmleft / hmright: ngăn kéo trượt vào từ mép.
        'drawer-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'none' },
        },
        'drawer-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'none' },
        },
        // hmpop: nảy nhẹ khi chọn đúng hoặc lưu xong.
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.035)' },
          '100%': { transform: 'scale(1)' },
        },
        // hmshake: lắc ngang khi chọn sai.
        shake: {
          '0%, 100%': { transform: 'none' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(7px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        // hmping: vòng toả ra rồi mờ dần (chấm trạng thái, quanh micro).
        'ping-soft': {
          '0%': { transform: 'scale(1)', opacity: '.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        // Vòng quanh nút micro toả hẹp hơn để không tràn khung.
        'ping-mic': {
          '0%': { transform: 'scale(1)', opacity: '.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        // hmbar: vạch sóng âm nhún lên xuống.
        bar: {
          from: { transform: 'scaleY(.25)' },
          to: { transform: 'scaleY(1)' },
        },
        // hmgrow / hmgrowY: thanh tiến độ và cột biểu đồ mọc ra.
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'grow-y': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        // hmdraw / hmline: nét vẽ dấu tích và đường biểu đồ.
        draw: {
          from: { strokeDashoffset: '60' },
          to: { strokeDashoffset: '0' },
        },
        line: {
          from: { strokeDashoffset: '1400' },
          to: { strokeDashoffset: '0' },
        },
        // hmdot: ba chấm "đang gõ/đang kết nối".
        dot: {
          '0%, 80%, 100%': { transform: 'scale(.6)', opacity: '.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        // hmdrop: menu thả xuống.
        drop: {
          from: { opacity: '0', transform: 'translateY(-8px) scale(.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        // hmword: tiêu đề hiện lại mỗi khi đổi chữ (gắn key theo nội dung).
        word: {
          from: { opacity: '0', transform: 'translateY(60%) rotateX(-60deg)', filter: 'blur(6px)' },
          to: { opacity: '1', transform: 'none', filter: 'none' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        // hmscan dùng top; ở đây đổi sang translateY cho nhẹ, phần tử cha phải
        // có chiều cao cố định và vạch đặt top-0.
        scan: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(var(--scan-distance, 120px))' },
        },
        // hmflash: nền xanh nhạt loé lên khi vừa lưu.
        flash: {
          from: { backgroundColor: '#ECFDF3' },
          to: { backgroundColor: 'transparent' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        in: 'in .5s cubic-bezier(.2,.8,.2,1) both',
        'in-sm': 'in-sm .4s cubic-bezier(.2,.8,.2,1) both',
        'slide-in': 'slide-in .45s cubic-bezier(.2,.8,.2,1) both',
        'drawer-left': 'drawer-left .35s cubic-bezier(.2,.8,.2,1) both',
        'drawer-right': 'drawer-right .35s cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop .45s ease both',
        shake: 'shake .45s ease both',
        'ping-soft': 'ping-soft 1.8s ease-out infinite',
        'ping-mic': 'ping-mic 1.6s ease-out infinite',
        bar: 'bar .5s ease-in-out infinite alternate',
        'grow-x': 'grow-x 1s .3s cubic-bezier(.2,.8,.2,1) both',
        'grow-y': 'grow-y .8s cubic-bezier(.2,.8,.2,1) both',
        draw: 'draw .6s ease both',
        line: 'line 1.6s .2s cubic-bezier(.2,.8,.2,1) both',
        dot: 'dot 1.2s ease-in-out infinite',
        drop: 'drop .22s cubic-bezier(.2,.8,.2,1) both',
        word: 'word .5s cubic-bezier(.2,.8,.2,1) both',
        float: 'float 6s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        scan: 'scan 2.4s ease-in-out infinite',
        flash: 'flash 1.6s ease both',
        'spin-slow': 'spin 50s linear infinite',
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
