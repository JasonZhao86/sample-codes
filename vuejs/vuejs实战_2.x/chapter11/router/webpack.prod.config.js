var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var merge = require('webpack-merge');
var webpackBaseConfig = require('./webpack.config.js');

// 清空基本配置的插件列表
webpackBaseConfig.plugins = [];

module.exports = merge(webpackBaseConfig, {
    output: {
        publicPath: '/dist/',
        // 将入口文件重命名为带有 20 位 hash 值的唯一文件
        filename: '[name].[hash].js',
        /*
            使用了异步路由后，编译出的每个页面的js都叫作chunk（块），它们命名默认是O.main.js、1.main.js.....，
            可以在webpack配置的出口output里通过设直chunkFilename字段修改chunk命名：
        */
        // chunkFilename: '[name].chunk.js'
    },
    plugins: [
        new ExtractTextPlugin({
            // 有了chunk后，在每个页面（.vue 文件）里写的样式也需要配直后才会打包进main.css ,否则仍然会通过JavaScript动态创建＜style＞标签的形式写入。配直插件：
            filename: '[name].[hash].css',
            allChunks: true
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
    ]
});