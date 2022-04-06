import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import App from './app.vue';

Vue.use(VueRouter);
Vue.use(Vuex);

// 路由配置
const Routers = [
    {
        path: '/index',
        meta: {
            title: '首页'
        },
        component: (resolve) => require(['./views/index.vue'], resolve)
    },
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
        path: '*',
        redirect: '/index'
    }
];
const RouterConfig = {
    // 使用 HTML5 的 History 路由模式
    mode: 'history',
    routes: Routers
};
const router = new VueRouter(RouterConfig);

router.beforeEach((to, from, next) => {
    window.document.title = to.meta.title;
    next();
});

router.afterEach((to, from, next) => {
    window.scrollTo(0, 0);
});

// 仓库store包含了应用的数据（状态）和操作过程。Vuex里的数据都是响应式的，任何组件使用同一store的数据时，只要store的数据变化，对应的组件也会立即更新。
const store = new Vuex.Store({
    state: {
        count: 0,
        list: [1, 5, 8, 10, 30, 50]
    },
    // vuex的getters用法与组件的computed计算属性非常像，它实际上就是用来解决多个组件之间共享computed属性的，免得同一个computed属性在多个组件中重复定义。
    getters: {
        filteredList: state => {
            return state.list.filter(item => item < 10);
        },
        // getter也可以依赖其他的getter，把getters作为第二个参数调用其他getter
        listCount: (state, getters) => {
            return getters.filteredList.length;
        }
    },
    mutations: {
        increment (state, n = 1) {
            state.count += n;
        },
        decrease (state) {
            state.count --;
        },
        incrementType(state, params) {
            state.counter += params.count
        }
    },
    // mutation里不应该异步操作数据，所以有了actions选项。action与mutation很像，不同的是action里面提交的是mutation，井且可以异步操作业务逻辑。
    actions: {
        increment (context) {
            context.commit('increment');
        },
        asyncIncrement (context) {
            return new Promise(resolve => {
                setTimeout(() => {
                    context.commit('increment');
                    resolve();
                }, 1000)
            });
        },
        // 以上异步action采用promise实现的方式还可以用普通的回调来实现：
        asyncIncrementNoPromise (context, callback) {
            setTimeout(() => {
                context.commit('increment');
                callback();
            }, 1000)
        }
    }
});

new Vue({
    el: '#app',
    router: router,
    store: store,
    render: h => {
        return h(App)
    }
});