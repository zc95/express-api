const express = require('express');
const app = express();
const { mkdirsSync } = require('./utils/file');

// 创建uploads文件夹
mkdirsSync('uploads');

// 对传入的请求体进行解析
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 路由中间件
app.use('/api/xmind', require('./routes/xmind')); // xmind转excel
// app.use('/api/alioss', require('./routes/alioss')); // 阿里云oss
app.use('/api/poster', require('./routes/poster')); // 生成海报

// 监听端口
const port = 4000;
app.listen(port, () => {
    console.log(`dashboard-api is listening at http://localhost:${port}`);
});
