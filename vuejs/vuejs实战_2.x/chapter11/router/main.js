import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './app.vue';

Vue.use(VueRouter);

// 路由配置
const Routers = [
    {
        path: '/index',
        meta: {
            title: '首页'
        },
        // webpack会把每一个路由都打包为一个js文件，在请求到该页面时，才去加载这个页面的js, 也就是异步实现的懒加载（按需加载），这叫异步路由
        component: (resolve) => require(['./views/index.vue'], resolve)
    },
    // {
    //     path: '/index',
    //     // 如果非要一次性加载，也可以这样写，即在打开首页的时候就把所有的页面内容全部加载进来
    //     component: require('./views/index.vue')
    // },
    {
        path: '/about',
        meta: {
            title: '关于'
        },
        component: (resolve) => require(['./views/about.vue'], resolve)
    },
    {
        path: '/user/:id',
        meta: {
            title: '个人主页'
        },
        component: (resolve) => require(['./views/user.vue'], resolve)
    },
    {
        // 当访问的路径不存在时，重定向到首页：
        path: '*',
        redirect: '/index'
    }
];
const RouterConfig = {
    // 使用HTML5的History路由模式，通过“/”设置路径。如果不配置mode，就会使用“＃”来设置路径
    mode: 'history',
    routes: Routers
};
const router = new VueRouter(RouterConfig);

// 它们会在路由即将改变前和改变后触发
router.beforeEach((to, from, next) => {
    window.document.title = to.meta.title;
    // 调用该方法后，才能进入下一个钩子。
    next();
});

/*
// 某些页面需要校验是否登录，如果登录了就可以访问，否则跳转到登录页
router.beforeEach((to, from, next) => {
    if (window.localStorage.getItem('token')) {
        next()
    } else {
        // next（）的参数设置为false时，可以取消导航，设置为具体的路径可以导航到指定的页面。
        next('/login')
    }
})
 */

// 它们会在路由即将改变前和改变后触发
router.afterEach((to, from, next) => {
    window.scrollTo(0, 0);
});

new Vue({
    el: '#app',
    router: router,
    render: h => {
        return h(App)
    }
});