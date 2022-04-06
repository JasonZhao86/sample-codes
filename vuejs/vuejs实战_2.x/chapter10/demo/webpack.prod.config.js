var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var merge = require('webpack-merge');
var webpackBaseConfig = require('./webpack.config.js');

// 清空基本配置的插件列表
webpackBaseConfig.plugins = [];

// webpack-merge模块就是用于合并两个webpack的配置文件，所以prod的配置是在webpack.config.js基础上扩展的。
module.exports = merge(webpackBaseConfig, {
    output: {
        publicPath: '/dist/',
        // 将入口文件重命名为带有 20 位 hash 值的唯一文件
        filename: '[name].[hash].js'
    },
    plugins: [
        new ExtractTextPlugin({
            // 提取 css，并重命名为带有 20 位 hash 值的唯一文件
            filename: '[name].[hash].css',
            allChunks: true
            /*
                静态资源在大部分场景下都有缓存（304），更新上线后一般都希望用户能及时地看到内容，所以给打包后的css和js文件的
                名称都加了20位的hash值，这样文件名就唯一了（比如main.b3dd20e2dae9d76af86b.js），只要不对html文件设置
                缓存，上线后立即就可以加载最新的静态资源。
            */
        }),
        // 定义当前 node 环境为生产环境
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: '"production"'
            }
        }),
        // 压缩 js
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),
        // 提取模板，并保存入口 html 文件
        new HtmlWebpackPlugin({
            filename: '../index_prod.html',
            template: './index.ejs',
            inject: false
        })
        /*
            html-webpack-plugin是用来生成html文件的，它通过template选项来读取指定的模板index.ejs，然后输出到filename
            指定的目录，也就是demo/index_prod.html。模板index.ejs动态设置了静态资源的路径和文件名。
            ejs是一个javascript模板库，用来从JSON数据中生成HTML字符串，常用于Node.js
        */
    ]
});