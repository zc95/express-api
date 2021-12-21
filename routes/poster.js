const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// https://www.npmjs.com/package/puppeteer
router.post('/', async (req, res) => {
    try {
        const { url, width = 375, height = 667 } = req.body;
        const browser = await puppeteer.launch({
            headless: true
        });
        const page = await browser.newPage();
        //设置可视区域大小,默认的页面大小为 375x667 分辨率
        await page.setViewport({ width, height });
        await page.goto(url);
        const savePath = path.join(__dirname, '../uploads/example.png');
        const imgBuffer = await page.screenshot({
            path: savePath,
            type: 'png',
            fullPage: true //边滚动边截图
        });
        const base64Str = imgBuffer.toString('base64');
        res.json({
            code: 200,
            data: 'data:image/png;base64,' + base64Str,
            msg: '海报生成成功'
        });
        browser.close();
        // fs.unlinkSync(savePath);
    } catch (error) {
        res.status(500).json({
            message: error.message,
            errors: error.stack
        });
    }
});

module.exports = router;
