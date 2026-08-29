/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0C1014',
        shihui: '#D8D3C4',
        shenyan: '#2A2E33',
        kongque: '#3A6B5C',
        tongjin: '#B8894A',
        gouhuo: '#E56B3A',
        mianzhi: '#F3EBDA',
        xuezhu: '#8C2E1F',
        ink: '#E8E0D0',
        'ink-dim': '#9A9284'
      },
      fontFamily: {
        song: ['"Source Han Serif SC"', '"Noto Serif SC"', '"Songti SC"', '"STSong"', 'SimSun', 'serif'],
        hei: ['"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif']
      },
      boxShadow: {
        carve: 'inset 0 -2px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.06)',
        torch: '0 0 24px rgba(229,107,58,0.35)'
      }
    }
  },
  plugins: []
};
