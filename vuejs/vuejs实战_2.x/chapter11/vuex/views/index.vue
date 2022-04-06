<template>
    <div>
        <h1>首页</h1>
        <!-- 直接写在template 里显得有点乱，可以用一个计算属性来显示： -->
        <!-- {{ $store.state.counter }} -->
        {{ count }}
        <button @click="handleIncrement">+1</button>
        <button @click="handleDecrease">-1</button>
        <button @click="handleIncrementMore">+5</button>
        <button @click="handleIncrementType">+10</button>
        <div>{{ list }}</div>
        <div>{{ listCount }}</div>
        <button @click="handleActionIncrement">action +1</button>
        <button @click="handleAsyncIncrement">async +1</button>
        <button @click="handleAsyncNoPromiseActionIncrement">async nopromise action + 10</button>
    </div>
</template>
<script>
    export default {
        computed: {
            count () {
                return this.$store.state.count;
            },
            list () {
                return this.$store.getters.filteredList;
            },
            listCount () {
                return this.$store.getters.listCount;
            }
        },
        methods: {
            // 在组件内，来自store的数据只能读取，不能手动改变，改变store中数据的唯一途径就是显式地提交mutations
            handleIncrement () {
                this.$store.commit('increment');
            },
            handleDecrease () {
                // 这看起来很像JavaScript的观察者模式，组件只负责提交一个事件名，Vuex对应的mutations来完成业务逻辑。
                this.$store.commit('decrease');
            },
            handleIncrementMore () {
                this.$store.commit('increment', 5);
            },
            handleIncrementType() {
                // 提交mutation的另一种方式是直接使用包含type属性的对象
                this.$store.commit({
                    type: 'incrementType',
                    count: 10
                })
            },
            handleActionIncrement () {
                this.$store.dispatch('increment')
            },
            handleAsyncIncrement () {
                this.$store.dispatch('asyncIncrement').then(() => {
                    console.log(this.$store.state.count);
                });
            },
            handleAsyncNoPromiseActionIncrement() {
                // 第二个参数传入异步回调的函数，
                this.$store.dispatch(('asyncIncrementNoPromise'), () => console.log(this.$store.state.counter))
            }
        }
    }
</script>