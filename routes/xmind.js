const express = require('express');
const router = express.Router();
const Xmindparser = require('../utils/xmindparser'); // https://www.npmjs.com/package/xmindparser
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// 存储文件
var storage = multer.diskStorage({
    // 存放的路径
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    // 重命名上传的文件
    filename: function (req, file, cb) {
        cb(null, `xmind-${uuidv4()}.xmind`);
    }
});

// 上传中间件
const uploadMiddle = multer({
    storage
}).single('file');

// xmind转excel
router.post('/conversion', uploadMiddle, async (req, res) => {
    try {
        // xmind解析成json
        const jsonRes = await xmindToJson(req.file.path);

        // 移除临时文件
        fs.unlinkSync(req.file.path);

        // 检查json合法性
        if (!(jsonRes.data && jsonRes.children && jsonRes.children.length > 0)) {
            return res.status(500).send('XMind文件中读取不到测试用例数据');
        }

        // 调整json格式并返回
        const transformedJson = await transformArray(jsonRes.children);
        res.send({
            code: 200,
            data: transformedJson
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * xmind转json
 * @param {*} fileOrPath 文件路径
 * @returns
 */
function xmindToJson(fileOrPath) {
    return new Promise((resolve) => {
        let parser = new Xmindparser();
        parser.xmindToJSON(fileOrPath).then((json) => {
            const { root } = json;
            resolve(root);
        });
    });
}

/**
 * 【数组变形】将 xmind解析出来的数组 转化成excel需要的数组格式
 * @param {*} xmindArray xmind解析出来的数组
 */
function transformArray(xmindArray = []) {
    return new Promise((resolve, reject) => {
        try {
            let jsonData = [];
            // 遍历用例目录
            xmindArray.forEach((directory) => {
                // 遍历用例
                directory.children.forEach((caseItem) => {
                    // 用例步骤 和 预期结果
                    let steps = '';
                    let results = '';
                    caseItem.children.forEach((item, index) => {
                        if (item && item.data && item.data.text) {
                            const stepStr = replacelineBreak(item.data.text);
                            steps += `${index + 1}. ${stepStr} \n`;
                        } else {
                            steps += `${index + 1}. 无 \n`;
                        }
                        if (item && item.children && item.children[0] && item.children[0].data && item.children[0].data.text) {
                            const resultstr = replacelineBreak(item.children[0].data.text);
                            results += `${index + 1}. ${resultstr} \n`; // 这边暂时只考虑一个预期结果
                        } else {
                            results += `${index + 1}. 无 \n`;
                        }
                    });

                    // 崭新的数据格式
                    jsonData.push({
                        directory: directory.data.text, // 用例目录
                        caseName: caseItem.data.text, // 用例名称
                        caseId: '', // 需求ID
                        precondition: '无', // 前置条件
                        steps, // 用例步骤
                        results, // 预期结果
                        caseType: '功能测试', // 用例类型
                        caseStatus: '正常', // 用例状态
                        priority: getPriority(caseItem.data.priority), // 用例等级
                        creator: '', // 创建人
                        performResult: '' // 执行结果
                    });
                });
            });
            const headerData = {
                directory: '用例目录',
                caseName: '用例名称',
                caseId: '需求ID',
                precondition: '前置条件',
                steps: '用例步骤',
                results: '预期结果',
                caseType: '用例类型',
                caseStatus: '用例状态',
                priority: '用例等级',
                creator: '创建人',
                performResult: '执行结果'
            };
            resolve({
                jsonData,
                headerData
            });
        } catch (error) {
            reject(error);
        }
    });
}

// 获取用户等级 1:高，2:中，3:低
function getPriority(level) {
    return (
        {
            1: '高',
            2: '中',
            3: '低'
        }[level] || ''
    );
}

/**
 * 去除字符串中的换行（换行符会导致excel导入tapd乱码 _x000d__x000d_）
 * @param {*} str 字符串
 * @returns 去除换行后的字符串
 */
function replacelineBreak(str) {
    if (typeof str !== 'string') return;
    // 空白暂时不去除 \s*|
    return str.replace(/\t|\r|\n|\r\n/g, '');
}

module.exports = router;
