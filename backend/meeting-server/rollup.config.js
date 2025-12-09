import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  // 指定入口文件 (这里直接指定 node_modules 里的客户端主文件)
  input: 'node_modules/mediasoup-client/lib/index.js',
  
  // 指定输出文件
  output: {
    // 輸出格式为 UMD (Universal Module Definition)，浏览器可以直接使用
    format: 'umd', 
    // 定义全局变量名，这样在 HTML 中才能用 MediasoupClient
    name: 'MediasoupClient',
    // 输出到项目根目录下的 build/ 文件夹
    file: 'build/mediasoup-client.bundle.js', 
  },
  
  plugins: [
    // 解决 Node.js 模块路径
    resolve({ browser: true }),
    // 转换 CommonJS 模块为 ES Modules
    commonjs(),
  ]
};